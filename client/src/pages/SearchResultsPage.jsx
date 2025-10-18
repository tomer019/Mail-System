// client/src/pages/SearchResultsPage.jsx
// NOTE: comments in English only

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../utils/api";
import Loading from "../components/Loading";

const normalize = (s) => (s || "").toString().trim().toLowerCase();

// Decode email from JWT payload
const emailFromToken = (jwt) => {
  try {
    const b64 = (jwt || "").split(".")[1];
    if (!b64) return "";
    const json = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
    const p = JSON.parse(json);
    return (
      p.email ||
      p.user?.email ||
      p.preferred_username ||
      (typeof p.sub === "string" && p.sub.includes("@") ? p.sub : "") ||
      ""
    );
  } catch {
    return "";
  }
};

// Extract a single email from string/object/array
const extractEmail = (v) => {
  if (!v) return "";
  // string: maybe "Full Name <user@x>" or plain "user@x"
  if (typeof v === "string") {
    const m = v.match(/<([^>]+)>/); // capture address inside < >
    const addr = m ? m[1] : v;
    return normalize(addr);
  }
  // array: return first valid email we find
  if (Array.isArray(v)) {
    for (const el of v) {
      const e = extractEmail(el);
      if (e) return e;
    }
    return "";
  }
  // object: common fields { email } or { address } or { value: "name <mail>" }
  if (typeof v === "object") {
    if (typeof v.email === "string") return normalize(v.email);
    if (typeof v.address === "string") return normalize(v.address);
    if (typeof v.value === "string") return extractEmail(v.value);
  }
  return "";
};

const senderEmailOf = (mail) =>
  (mail && (extractEmail(mail.sender) || extractEmail(mail.from))) || "";

const recipientEmailOf = (mail) =>
  (mail && (extractEmail(mail.recipient) || extractEmail(mail.to))) || "";

// Accepts array of strings OR objects with a `name` field
const hasNameDraft = (labelsOrNames) => {
  if (!Array.isArray(labelsOrNames)) return false;
  return labelsOrNames.some((x) => {
    if (typeof x === "string") return normalize(x) === "drafts";
    if (x && typeof x.name === "string") return normalize(x.name) === "drafts";
    return false;
  });
};

const SearchResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";
  const myEmail = useMemo(() => normalize(emailFromToken(token)), [token]);
  const query = new URLSearchParams(location.search).get("q") || "";
  const [mails, setMails] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  //const [error, setError] = useState("");

  const [draftsId, setDraftsId] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Caches to avoid duplicate network calls per mailId
  const draftLabelCacheRef = useRef(new Map()); // mailId -> boolean
  const inflightRef = useRef(new Map());        // mailId -> Promise<boolean>

  // 1) fetch labels to get the real "drafts" label id
  useEffect(() => {
    let dead = false;
    const run = async () => {
      if (!token || !query.trim()) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        // IMPORTANT: pass { token }
        const list = await fetchWithAuth("/labels", token);
        const drafts = (list || []).find(
          (l) => (l.name || "").toLowerCase() === "drafts"
        );
        if (!dead) setDraftsId(drafts ? drafts.id : null);
      } catch (e) {
        if (!dead) setDraftsId(null);
      }
    };
    run();
    return () => { dead = true; };
  }, [token]);

  // Ask server if a mail has Drafts; supports multiple response shapes
  const checkIsDraftByServerLabels = async (mailId) => {
    if (!mailId || !token) return false;

    // cache hit
    const cache = draftLabelCacheRef.current;
    if (cache.has(mailId)) return cache.get(mailId);

    // collapse concurrent calls for same id
    const inflight = inflightRef.current;
    if (inflight.has(mailId)) return inflight.get(mailId);

    const p = (async () => {
      try {
        const res = await fetch(`/api/labels/mail/${mailId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return false;

        const arr = await res.json();
        if (!Array.isArray(arr)) return false;

        // supports: ["Inbox","Drafts"] OR ["id1","id2"] OR [{id,name}, ...]
        let result = false;
        if (arr.length && typeof arr[0] === "object") {
          result = arr.some(
            (l) =>
              normalize(l?.name) === "drafts" ||
              (draftsId != null && String(l?.id) === String(draftsId))
          );
        } else if (arr.length && typeof arr[0] === "string") {
          const names = arr.map(normalize);
          if (names.includes("drafts")) result = true;
          else if (draftsId != null) {
            result = arr.map(String).includes(String(draftsId));
          }
        }

        cache.set(mailId, result);
        return result;
      } catch {
        return false;
      } finally {
        inflight.delete(mailId);
      }
    })();

    inflight.set(mailId, p);
    return p;
  };

  // 2) run search and hard-filter
  useEffect(() => {
    let dead = false;

    const run = async () => {
      if (!token || !query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      setErr("");
      try {
        // try /api/mails/search first
        const tryFetch = async (path) => {
          // IMPORTANT: pass { token }
          return await fetchWithAuth(
            `${path}?q=${encodeURIComponent(query)}&ts=${Date.now()}`,
            token
          );
        };

        let data;
        try {
          data = await tryFetch("/mails/search"); // resolves to /api/mails/search inside fetchWithAuth
        } catch (e1) {
          // fallback to /api/search if the first path doesn't exist
          data = await tryFetch("/search");
        }

        const raw = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : [];

        // enrich with precise draft flag by querying label ids when needed
        const enriched = await Promise.all(
          raw.map(async (m) => {
            const sender = normalize(senderEmailOf(m));
            const recipient = normalize(recipientEmailOf(m));

            let isDraft =
              m?.isDraft === true ||
              hasNameDraft(m?.labels || []);

            // Prefer local labelIds if present; compare as strings
            if (!isDraft && Array.isArray(m.labelIds) && draftsId != null) {
              const ids = m.labelIds.map(String);
              isDraft = ids.includes(String(draftsId));
            }

            // Fallback: even if draftsId is null, ask server (can detect by name)
            if (!isDraft && !Array.isArray(m.labelIds)) {
              isDraft = await checkIsDraftByServerLabels(m.id);
            }

            return {
              ...m,
              __sender: sender,
              __recipient: recipient,
              __isDraft: !!isDraft,
            };
          })
        );

        // HARD FILTER:
        //  a) Only mails that involve me (sender or recipient)
        //  b) If draft -> only if I am the sender (owner)
        const safe = enriched.filter((m) => {
          const involvesMe =
            m.__sender === myEmail || m.__recipient === myEmail;

          if (!involvesMe) return false;
          if (!m.__isDraft) return true;
          return m.__sender === myEmail; // only my drafts
        });

        // Debug traces (optional)
        console.table(
          enriched.map((m) => ({
            id: m.id,
            subj: m.subject,
            sender: m.__sender,
            recipient: m.__recipient,
            isDraft: m.__isDraft,
            kept: safe.some((x) => x.id === m.id),
          }))
        );
        console.log("[labels] draftsId:", draftsId);
        console.table(
          enriched.map((m) => ({
            id: m.id,
            hasIsDraft: m?.isDraft === true,
            hasLabels: Array.isArray(m.labels),
            hasLabelIds: Array.isArray(m.labelIds),
            __isDraft: m.__isDraft,
          }))
        );

        if (!dead) setResults(safe);
      } catch (e) {
        console.error("[Search] error:", e);
        if (!dead) {
          setErr("Failed to load search results");
          setResults([]);
        }
      } finally {
        if (!dead) setIsLoading(false);
      }
    };

    run();
    // re-run when query, token, or draftsId changes
  }, [query, token, draftsId, myEmail]);

  const openItem = (m) => {
    if (!m?.id) return;
    if (m.__isDraft) {
      navigate(`/draft/${m.id}`, { state: { assumeDraft: true } }); // no /edit
    } else {
      navigate(`/mail/${m.id}`);
    }
  };


  return (
    <div style={{ padding: "1rem" }}>
      <h1>Search Results for: "{query}"</h1>
      {isLoading ? (
        <Loading label="Searching…" />
      ) : results.length === 0 ? (
        <p>No matching mails found.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {results.map((m) => (
            <li
              key={m.id}
              onClick={() => openItem(m)}
              style={{
                cursor: "pointer",
                border: "1px solid #ccc",
                padding: "1rem",
                marginBottom: "1rem",
                borderRadius: "8px",
                backgroundColor: m.__isDraft ? "#fff7e6" : "#f9f9f9",
              }}
            >
              <strong>
                {m.subject || <em>(no subject)</em>}
                {m.__isDraft ? " [Draft]" : ""}
              </strong>
              <br />
              <strong>From:</strong>{" "}
              {extractEmail(m.sender) || extractEmail(m.from) || "(unknown)"}
              <br />
              <strong>Date:</strong>{" "}
              {m.timestamp
                ? new Date(m.timestamp).toLocaleString()
                : "Invalid Date"}
              <p style={{ color: "#666" }}>
                {m.preview ||
                  (m.content || "").slice(0, 100) || <em>(no content)</em>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchResultsPage;
