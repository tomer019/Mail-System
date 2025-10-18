// src/pages/DraftEditPage.jsx
// NOTE: comments in English only

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { fetchWithAuth } from "../utils/api";
import Loading from "../components/Loading";

const getDraftLabelId = (labelsList) => {
    const drafts = (labelsList || []).find(l => (l.name || "").toLowerCase() === "drafts");
    return drafts ? drafts.id : null;
};

const hasNameDraft = (labelsOrNames) => {
    if (!Array.isArray(labelsOrNames)) return false;
    return labelsOrNames.some(x => typeof x === "string" && x.toLowerCase() === "drafts");
};

const validateEmail = (s) => {
    // simple but effective
    const v = (s || "").trim();
    if (!v) return false;
    // very lightweight validation to avoid rejecting legitimate addresses
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
};

const parseRecipients = (raw) => {
    // split by comma, semicolon, or whitespace
    return (raw || "")
        .split(/[,;\s]+/)
        .map(s => s.trim())
        .filter(Boolean);
};

const DraftEditPage = () => {
    const { id } = useParams(); // draft id
    const navigate = useNavigate();
    const location = useLocation();
    const token = localStorage.getItem("token");

    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [mail, setMail] = useState(null);

    // editable fields
    const [fromEmail, setFromEmail] = useState(""); // sender
    const [to, setTo] = useState("");               // can contain multiple addresses
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");

    const assumeDraft = location.state?.assumeDraft === true;

    const resolveSender = (m) => {
        // 1) from loaded mail
        const fromMail =
            (typeof m?.sender === "string" && m.sender) ||
            m?.sender?.email ||
            m?.from ||
            "";

        // 2) from localStorage
        const fromStorage = localStorage.getItem("userEmail") || "";

        // 3) from JWT payload (best-effort)
        let fromJwt = "";
        try {
            const b64 = (token || "").split(".")[1];
            if (b64) {
                const json = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
                const p = JSON.parse(json);
                fromJwt =
                    p.email ||
                    p.user?.email ||
                    p.preferred_username ||
                    (typeof p.sub === "string" && p.sub.includes("@") ? p.sub : "") ||
                    "";
            }
        } catch { }

        const winner = fromMail || fromStorage || fromJwt || "";
        if (winner) localStorage.setItem("userEmail", winner); // cache for next time
        return winner;
    };

    useEffect(() => {
        let killed = false;

        (async () => {
            try {
                setLoading(true);
                setError("");

                // Load labels, mail, and this mail's label IDs in parallel
                const [labelsList, m, perMailLabelIds] = await Promise.all([
                    fetchWithAuth("/labels", token).catch(() => []),
                    fetchWithAuth(`/mails/${id}`, token),
                    fetch(`/api/labels/mail/${id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }).then(r => (r.ok ? r.json() : [])).catch(() => []),
                ]);
                if (killed) return;

                const draftLabelId = getDraftLabelId(labelsList) || null;

                // Robust draft detection
                let isDraft = false;
                if (m?.isDraft === true) {
                    isDraft = true;
                } else if (draftLabelId && Array.isArray(perMailLabelIds) && perMailLabelIds.includes(draftLabelId)) {
                    isDraft = true;
                } else if (Array.isArray(m?.labels) && hasNameDraft(m.labels)) {
                    isDraft = true;
                }

                if (!isDraft && !assumeDraft) {
                    navigate(`/mail/${id}`, { replace: true });
                    return;
                }

                setMail(m);
                setFromEmail(resolveSender(m));
                setTo(m?.to || m?.recipient?.email || m?.recipient || "");
                setSubject(m?.subject || "");
                setBody(m?.body || m?.content || "");
            } catch (e) {
                if (!killed) setError("Failed to load draft");
            } finally {
                if (!killed) setLoading(false);
            }
        })();

        return () => { killed = true; };
    }, [id, token, navigate, assumeDraft]);

    const sendDraft = async () => {
        if (sending) return;
        setSending(true);

        const auth = localStorage.getItem("token");
        const sender = (fromEmail || "").trim();
        const parsed = parseRecipients(to);

        // validate sender
        if (!validateEmail(sender)) {
            alert("Sender is required (valid email).");
            setSending(false);
            return;
        }

        // validate recipients
        const invalid = parsed.filter(e => !validateEmail(e));
        const recipients = parsed.filter(e => validateEmail(e));

        if (invalid.length) {
            alert(`Invalid recipient(s): ${invalid.join(", ")}`);
        }
        if (!recipients.length) {
            alert("No valid recipients.");
            setSending(false);
            return;
        }

        // helper to POST once and return rich result
        const postOnce = async (payload) => {
            try {
                const res = await fetch(`/api/mails`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${auth}`,
                    },
                    body: JSON.stringify(payload),
                });

                let detail = "";
                try {
                    const ct = res.headers.get("content-type") || "";
                    if (ct.includes("application/json")) {
                        const j = await res.json();
                        detail = j?.message || j?.error || JSON.stringify(j);
                    } else {
                        detail = await res.text();
                    }
                } catch { }

                return { ok: res.ok || res.status === 201 || res.status === 202, status: res.status, detail };
            } catch (e) {
                return { ok: false, status: 0, detail: `Network error: ${e.message}` };
            }
        };

        try {

            // 2) Single sends for each recipient
            const results = [];
            for (const r of recipients) {
                const payload = {
                    sender,
                    recipient: r,      // single-recipient schema
                    subject: subject || "",
                    content: body || "",
                    isDraft: false
                };
                // eslint-disable-next-line no-await-in-loop
                const out = await postOnce(payload);
                results.push({ r, ...out });
            }

            const okCount = results.filter(x => x.ok).length;
            const fail = results.filter(x => !x.ok);

            if (okCount > 0) {
                // delete draft best-effort
                if (id) {
                    fetch(`/api/mails/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${auth}` } }).catch(() => { });
                }
                if (fail.length) {
                    alert(`Sent to ${okCount} recipient(s). Failed for: ${fail.map(f => `${f.r} (${f.status})`).join(", ")}`);
                }
                navigate("/label/sent", { replace: true });
            } else {
                const msg = fail.length
                    ? `All sends failed: ${fail.map(f => `${f.r} → ${f.status} ${f.detail || ""}`).join(" | ")}`
                    : "Send failed (unknown error)";
                alert(msg);
            }
        } finally {
            setSending(false);
        }
    };

    if (loading) return <Loading label="Loading Draft Editor…" />;
    if (error) return <div style={{ padding: 16, color: "red" }}>{error}</div>;

    return (
        <div style={{ padding: 16, maxWidth: 800, margin: "0 auto" }}>
            <h2>Draft Editor</h2>

            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                <label style={{ fontWeight: 600 }}>
                    To
                    <input
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        style={{ width: "100%", padding: 8, marginTop: 4 }}
                        placeholder="alice@example.com, bob@example.com; charlie@example.com"
                        title="Separate multiple recipients with comma, semicolon, or space"
                    />
                </label>

                <label style={{ fontWeight: 600 }}>
                    Subject
                    <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        style={{ width: "100%", padding: 8, marginTop: 4 }}
                        placeholder="Subject"
                    />
                </label>

                <label style={{ fontWeight: 600 }}>
                    Body
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={10}
                        style={{ width: "100%", padding: 8, marginTop: 4, fontFamily: "monospace" }}
                        placeholder="Write your message…"
                    />
                </label>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                    onClick={sendDraft}
                    disabled={sending}
                    style={{
                        padding: "6px 12px",
                        border: "1px solid #28a745",
                        background: "#d4edda",
                        cursor: sending ? "not-allowed" : "pointer",
                    }}
                >
                    {sending ? "Sending..." : "Send"}
                </button>
                <button
                    onClick={() => navigate(-1)}
                    style={{ padding: "6px 12px", border: "1px solid #ccc", background: "#f1f3f4", cursor: "pointer" }}
                >
                    Back
                </button>
            </div>
        </div>
    );
};

export default DraftEditPage;
