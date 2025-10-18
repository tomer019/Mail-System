// LabelPage.jsx

import { FaTrash } from "react-icons/fa";
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../utils/api";
import { useSearch } from "../context/SearchContext";
import { useLocation } from "react-router-dom";
import Loading from "../components/Loading";

const LabelPage = () => {
  const { labelId } = useParams();
  const [mails, setMails] = useState([]);
  const [labelName, setLabelName] = useState("");
  const [allLabels, setAllLabels] = useState([]);
  const [error, setError] = useState("");
  const { searchQuery, setSearchQuery } = useSearch();
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  // label + draft detection helpers
  const [draftLabelId, setDraftLabelId] = useState(null);
  const [labelsReady, setLabelsReady] = useState(false); // true after /labels loaded

  // per-mail labels and UI state
  const [currentMailLabels, setCurrentMailLabels] = useState({});
  const [openLabelManagement, setOpenLabelManagement] = useState({});
  const [pendingLabelChanges, setPendingLabelChanges] = useState({});

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // ---------- helpers ----------
  const normalize = (text) => (text || "").toString().trim().toLowerCase();
  /*<<<<<<< MAIL-333-Ensure-Real-Backend-Communication
  
    const getDraftLabelId = (labelsList) => {
      const drafts = (labelsList || []).find(
        (l) => (l.name || "").toLowerCase() === "drafts"
      );
      return drafts ? drafts.id : null;
    };
  
    const hasNameDraft = (labelsOrNames) => {
      // detect 'drafts' string among names
      if (!Array.isArray(labelsOrNames)) return false;
      return labelsOrNames.some(
        (x) => typeof x === "string" && normalize(x) === "drafts"
      );
    };
  
    const includesId = (arr, id) =>
      Array.isArray(arr) && id != null ? arr.includes(id) : false;
  
    const isDraftMailRobust = (mail) => {
      // 1) explicit boolean from server
      if (mail?.isDraft === true) return true;
  
      // 2) labels on the mail object itself (could be ids or names)
      if (Array.isArray(mail?.labels)) {
        if (draftLabelId && includesId(mail.labels, draftLabelId)) return true;
        if (hasNameDraft(mail.labels)) return true;
      }
  
      // 3) labels we fetched per mail id (ids only)
      const idsForMail = currentMailLabels[mail?.id] || [];
      if (draftLabelId && includesId(idsForMail, draftLabelId)) return true;
  
      // 4) current page is drafts label (extra safety)
      if (normalize(labelName) === "drafts" || normalize(labelId) === "drafts")
        return true;
  
      return false;
    };
  
    const safeOpenMail = (mail) => {
      // If labels are not ready yet AND server didn't mark isDraft=true,
      // avoid accidental opening – wait until labelsReady.
      if (!labelsReady && mail?.isDraft !== true) {
        // You can show a toast here if you want.
        return;
      }
  
      if (isDraftMailRobust(mail)) {
        navigate(`/draft/${mail.id}`);
        return;
      }
      navigate(`/mail/${mail.id}`);
    };
  
    // ---------- effects ----------
    useEffect(() => {
      setSearchQuery("");
      if (!token) return;
  
      // compute display name for label
      if (labelId === "inbox" || labelId === "sent") {
        setLabelName(labelId);
      } else {
        fetchWithAuth(`/labels/${labelId}`, token)
          .then((data) => setLabelName(data?.name || labelId))
          .catch(() => setLabelName(labelId));
      }
  
  =======*/

  const getDraftLabelId = (labelsList) => {
    const drafts = (labelsList || []).find(
      (l) => (l.name || "").toLowerCase() === "drafts"
    );
    return drafts ? drafts.id : null;
  };

  const hasNameDraft = (labelsOrNames) => {
    // detect 'drafts' string among names
    if (!Array.isArray(labelsOrNames)) return false;
    return labelsOrNames.some(
      (x) => typeof x === "string" && normalize(x) === "drafts"
    );
  };

  const includesId = (arr, id) =>
    Array.isArray(arr) && id != null ? arr.includes(id) : false;

  const isDraftMailRobust = (mail) => {
    // 1) explicit boolean from server
    if (mail?.isDraft === true) return true;

    // 2) labels on the mail object itself (could be ids or names)
    if (Array.isArray(mail?.labels)) {
      if (draftLabelId && includesId(mail.labels, draftLabelId)) return true;
      if (hasNameDraft(mail.labels)) return true;
    }

    // 3) labels we fetched per mail id (ids only)
    const idsForMail = currentMailLabels[mail?.id] || [];
    if (draftLabelId && includesId(idsForMail, draftLabelId)) return true;

    // 4) current page is drafts label (extra safety)
    if (normalize(labelName) === "drafts" || normalize(labelId) === "drafts")
      return true;

    return false;
  };

  // Ensure a labelId exists for a given label name (create if missing). Names are lowercased.
  const ensureLabelIdByName = async (name) => {
    const wanted = String(name || "").trim().toLowerCase();
    if (!wanted) throw new Error("Invalid label name");

    // 1) try to find in the loaded list
    const exists = (allLabels || []).find(
      (l) => (l.name || "").toLowerCase() === wanted
    );
    if (exists) return exists.id;

    // 2) try to create once (backend must allow creating labels)
    const res = await fetch("/api/labels", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: wanted }),
    });

    if (!res.ok) {
      // read error body (json or text) for real diagnostics
      let msg = `Failed to create label '${wanted}' (${res.status})`;
      try {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } else {
          const t = await res.text();
          if (t) msg = t;
        }
      } catch { }
      throw new Error(msg);
    }

    const created = await res.json();
    setAllLabels((prev) => [...prev, created]); // keep client cache in sync
    return created.id;
  };

  // Resolve a system label name ('trash'/'spam'/'drafts') to a real numeric labelId
  const resolveSystemLabelId = async (nameLower) => {
    const nm = String(nameLower || "").toLowerCase();
    const found = (allLabels || []).find(
      (l) => (l.name || "").toLowerCase() === nm
    );
    if (found) return found.id;
    return await ensureLabelIdByName(nm);
  };

  const safeOpenMail = (mail) => {
    // If labels are not ready yet AND server didn't mark isDraft=true,
    // avoid accidental opening – wait until labelsReady.
    if (!labelsReady && mail?.isDraft !== true) {
      return;
    }
    if (isDraftMailRobust(mail)) {
      navigate(`/draft/${mail.id}`);
      return;
    }
    navigate(`/mail/${mail.id}`);
  };

  // ---------- effects ----------
  useEffect(() => {
    setSearchQuery("");
    if (!token) return;

    // compute display name for label (do not fetch system names)
    const sysNames = new Set(["inbox", "sent", "trash", "spam", "drafts"]);
    if (sysNames.has(String(labelId).toLowerCase())) {
      setLabelName(String(labelId).toLowerCase());
    } else {
      fetchWithAuth(`/labels/${labelId}`, token)
        .then((data) => setLabelName(data?.name || labelId))
        .catch(() => setLabelName(labelId));
    }
    const fetchMails = async () => {
      try {
        let validMails = [];

        if (labelId === "inbox" || labelId === "sent") {
          const response = await fetch("/api/mails", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();

          const list =
            labelId === "inbox"
              ? Array.isArray(data?.inbox)
                ? data.inbox
                : []
              : Array.isArray(data?.sent)
                ? data.sent
                : [];

          // exclude drafts immediately by explicit flag; names fallback remains
          const prelim = list.filter(
            (m) => m?.isDraft !== true && !hasNameDraft(m?.labels || [])
          );


          // filter out trash by querying label names (compat with current backend)
          const final = [];
          for (const mail of prelim) {
            try {
              const res = await fetch(`/api/labels/mail/${mail.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) {
                final.push(mail);
                continue;
              }
              const labelIds = await res.json();
              const names = await Promise.all(
                (labelIds || []).map(async (lid) => {
                  try {
                    const ld = await fetchWithAuth(`/labels/${lid}`, token);
                    return ld?.name?.toLowerCase() || "";
                  } catch {
                    return "";
                  }
                })
              );
              if (!names.includes("trash")) final.push(mail);
            } catch {
              final.push(mail);
            }
          }

          validMails = final;

        } else if (String(labelId).toLowerCase() === "trash") {
          // system "trash" page -> resolve to numeric id and list mails by that label
          const trashId = await resolveSystemLabelId("trash");
          const ids = await fetchWithAuth(`/labels/by-label/${trashId}`, token);
          if (Array.isArray(ids) && ids.length > 0) {
            const full = await Promise.all(
              ids.map(async (id) => {
                try {
                  return await fetchWithAuth(`/mails/${id}`, token);
                } catch {
                  return null;
                }
              })
            );
            validMails = full.filter(Boolean);
          } else {
            validMails = [];
          }
        } else if (String(labelId).toLowerCase() === "spam") {
          // system "spam" page -> resolve and list
          const spamId = await resolveSystemLabelId("spam");
          const ids = await fetchWithAuth(`/labels/by-label/${spamId}`, token);
          if (Array.isArray(ids) && ids.length > 0) {
            const full = await Promise.all(
              ids.map(async (id) => {
                try {
                  return await fetchWithAuth(`/mails/${id}`, token);
                } catch {
                  return null;
                }
              })
            );
            validMails = full.filter(Boolean);
          } else {
            validMails = [];
          }
        } else {
          // generic label view (numeric id)
          const ids = await fetchWithAuth(`/labels/by-label/${labelId}`, token);
          if (Array.isArray(ids) && ids.length > 0) {
            const full = await Promise.all(
              ids.map(async (id) => {
                try {
                  return await fetchWithAuth(`/mails/${id}`, token);
                } catch (err) {
                  console.warn(`Failed to fetch mail ${id}:`, err);
                  return null;
                }
              })
            );
            validMails = full.filter(Boolean);
          } else {
            validMails = [];
          }
        }

        setMails(validMails);

        // fetch labels per mail id
        const mailLabelsMap = {};
        for (const mail of validMails) {
          try {
            const res = await fetch(`/api/labels/mail/${mail.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
              mailLabelsMap[mail.id] = [];
              continue;
            }
            const labels = await res.json();
            mailLabelsMap[mail.id] = Array.isArray(labels) ? labels : [];
          } catch (err) {
            console.warn(`Failed to fetch labels for mail ${mail.id}:`, err);
            mailLabelsMap[mail.id] = [];
          }
        }
        setCurrentMailLabels(mailLabelsMap);
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load mail data");
      }
    };
    setLoading(true);
    fetchMails()
      .finally(() => setLoading(false));

    // load labels once and mark ready
    fetchWithAuth("/labels", token)
      .then((list) => {
        setAllLabels(list);
        setDraftLabelId(getDraftLabelId(list));
        setLabelsReady(true);
      })
      .catch((e) => {
        console.error(e);
        setLabelsReady(true); // even on error, avoid blocking clicks forever
      });
  }, [labelId, token, setSearchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // initialize pending selection when a label-management popover is opened
  useEffect(() => {
    const updates = {};
    let needUpdate = false;

    for (const [mid, isOpen] of Object.entries(openLabelManagement)) {
      if (isOpen && !pendingLabelChanges[mid]) {
        updates[mid] = currentMailLabels[mid] || [];
        needUpdate = true;
      }
    }
    if (needUpdate) {
      setPendingLabelChanges((prev) => ({ ...prev, ...updates }));
    }
  }, [openLabelManagement, currentMailLabels, pendingLabelChanges]); // do not include pendingLabelChanges

  // ---------- actions ----------
  const handleMoveToLabels = async (mailId) => {
    try {
      const selectedLabels = pendingLabelChanges[mailId] || [];
      const currentLabels = currentMailLabels[mailId] || [];

      for (const labelId of selectedLabels) {
        if (!currentLabels.includes(labelId)) {
          await fetch("/api/labels/tag", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ mailId, labelId }),
          });
        }
      }

      for (const labelId of currentLabels) {
        if (!selectedLabels.includes(labelId)) {
          await fetch("/api/labels/untag", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ mailId, labelId }),
          });
        }
      }

      setPendingLabelChanges((prev) => {
        const next = { ...prev };
        delete next[mailId];
        return next;
      });

      window.location.reload();
    } catch (err) {
      console.error("Error applying label changes:", err);
      alert("Failed to update labels.");
    }
  };

  const discardDraft = async (mailId) => {
    try {
      const res = await fetch(`/api/mails/${mailId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`delete failed ${res.status}`);

      // pass the deleted id so LabelPage can update immediately
      navigate("/label/drafts", { replace: true, state: { justDeletedId: mailId, ts: Date.now() } });

    } catch (e) {
      console.error(e);
      alert("Failed to discard draft.");
    }
  };

  useEffect(() => {
    const deletedId = location.state?.justDeletedId;
    if (!deletedId) return;

    // optimistic remove from UI
    setMails((prev) => prev.filter((m) => m.id !== deletedId));
    setCurrentMailLabels((prev) => {
      const next = { ...prev };
      delete next[deletedId];
      return next;
    });

    // clear the state so it won't re-apply on back/forward
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state?.justDeletedId, location.pathname, navigate]);

  // Move mail so that its only label becomes "trash"
  const moveMailToTrashOnly = async (mailId) => {
    try {
      // 1) ensure we have a labelId for "trash" (create if missing)
      const trashId = await ensureLabelIdByName("trash");

      // 2) fetch current labels ONCE
      const res = await fetch(`/api/labels/mail/${mailId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`labels fetch failed ${res.status}`);
      const currentLabels = await res.json();
      const safeCurrent = Array.isArray(currentLabels) ? currentLabels : [];

      // 3) untag all current labels (idempotent if none)
      await Promise.all(
        safeCurrent.map((lblId) =>
          fetch(`/api/labels/untag`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ mailId, labelId: lblId }),
          })
        )
      );

      // 4) tag only trash
      const tagRes = await fetch(`/api/labels/tag`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mailId, labelId: trashId }),
      });
      if (!tagRes.ok) throw new Error(`tag trash failed ${tagRes.status}`);

      // 5) optimistic UI update (remove from current list)
      setMails((prev) => prev.filter((m) => m.id !== mailId));
      setCurrentMailLabels((prev) => ({ ...prev, [mailId]: [trashId] }));
    } catch (err) {
      console.error("Error moving mail to trash:", err);
      alert(err.message || "Failed to move mail to trash");
    }
  };

  // ---------- filtering ----------
  const filteredMails = mails.filter((mail) => {
    const search = normalize(searchQuery);

    const sender =
      typeof mail.sender === "string"
        ? normalize(mail.sender)
        : normalize(mail.sender?.email || "");

    const recipient =
      typeof mail.recipient === "string"
        ? normalize(mail.recipient)
        : normalize(mail.recipient?.email || "");

    const subject = normalize(mail.subject);
    const content = normalize(mail.content);

    if (search === "") return true;

    return (
      subject.includes(search) ||
      content.includes(search) ||
      sender.includes(search) ||
      recipient.includes(search)
    );
  });

  // ---------- render ----------
  return (
    <div style={{ padding: "1rem" }}>
      {labelId === "inbox" && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          />
        </>
      )}

      {labelId !== "inbox"}
      {loading ? (
        <Loading label="Loading Mails…" />
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : filteredMails.length === 0 ? (
        <p>No mails found.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {filteredMails.map((mail) => {
            const draft = isDraftMailRobust(mail);

            return (
              <li
                key={mail.id}
                // do not attach onClick for drafts to avoid accidental navigation
                onClick={draft ? undefined : () => safeOpenMail(mail)}
                style={{
                  cursor: draft ? "default" : "pointer",
                  border: "1px solid #ccc",
                  padding: "1rem",
                  marginBottom: "1rem",
                  borderRadius: "8px",
                  backgroundColor: draft ? "#fff7e6" : "#f9f9f9",
                }}
              >
                <strong>From:</strong>{" "}
                {(() => {
                  const sender = mail.sender || mail.otherParty;
                  if (!sender) return "(unknown)";
                  if (typeof sender === "string") return sender;
                  return (
                    sender.email ||
                    `${sender.firstName || ""} ${sender.lastName || ""}`.trim()
                  );
                })()}
                <br />
                <strong>Subject:</strong>{" "}
                {mail.subject || <em>(no subject)</em>} <br />
                <strong>Date:</strong>{" "}
                {mail.timestamp
                  ? new Date(mail.timestamp).toLocaleString()
                  : "Invalid Date"}
                <br />
                <p style={{ color: "#666" }}>
                  {mail.preview ||
                    mail.content?.slice(0, 100) || <em>(no content)</em>}
                </p>

                {draft ? (
                  // Drafts: show explicit Edit button and block parent click bubbling
                  <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()} // prevent parent from seeing this click
                      onClick={(e) => {
                        e.stopPropagation(); // belt-and-suspenders
                        navigate(`/draft/${mail.id}`, { state: { assumeDraft: true } }); // <-- add state

                      }}
                      style={{
                        backgroundColor: "#e8f0fe",
                        border: "1px solid #c6dafc",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Edit Draft
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Discard this draft permanently?")) {
                          discardDraft(mail.id); // <-- now defined
                        }
                      }}
                      style={{
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        cursor: "pointer",
                      }}
                    >
                      Discard Draft
                    </button>
                  </div>
                ) : (
                  <>
                    {!["trash", "drafts"].includes(
                      (labelName || "").toLowerCase()
                    ) && (
                        <div style={{ marginBottom: "0.5rem" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenLabelManagement((prev) => ({
                                ...prev,
                                [mail.id]: !prev[mail.id],
                              }));
                            }}
                            style={{
                              cursor: "pointer",
                              color: "#174ea6",
                              fontWeight: "500",
                              marginBottom: "0.3rem",
                              background: "none",
                              border: "none",
                              textDecoration: "underline",
                            }}
                          >
                            {openLabelManagement[mail.id]
                              ? "Hide Labels"
                              : "Manage Labels"}
                          </button>

                          {openLabelManagement[mail.id] && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                padding: "0.5rem 0",
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "0.5rem",
                              }}
                            >
                              {allLabels
                                .filter(
                                  (label) =>
                                    (label.name || "").toLowerCase() !== "trash"
                                )
                                .map((label) => {
                                  const isPendingSelection = (
                                    pendingLabelChanges[mail.id] || []
                                  ).includes(label.id);

                                  return (
                                    <label
                                      key={label.id}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        backgroundColor: isPendingSelection
                                          ? "#e8f0fe"
                                          : "#f1f3f4",
                                        color: isPendingSelection
                                          ? "#174ea6"
                                          : "#202124",
                                        padding: "4px 10px",
                                        borderRadius: "16px",
                                        border: isPendingSelection
                                          ? "1px solid #174ea6"
                                          : "1px solid #ccc",
                                        fontSize: "0.85rem",
                                        cursor: "pointer",
                                        fontWeight: isPendingSelection
                                          ? "500"
                                          : "normal",
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        style={{ marginRight: "6px" }}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          setPendingLabelChanges((prev) => {
                                            const base =
                                              prev[mail.id] ||
                                              currentMailLabels[mail.id] ||
                                              [];
                                            const pending = new Set(base);
                                            if (e.target.checked) {
                                              pending.add(label.id);
                                            } else {
                                              pending.delete(label.id);
                                            }
                                            return {
                                              ...prev,
                                              [mail.id]: Array.from(pending),
                                            };
                                          });
                                        }}
                                        checked={isPendingSelection}
                                      />
                                      <span onClick={(e) => e.stopPropagation()}>
                                        {label.name}
                                      </span>
                                    </label>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      )}

                    {(labelName || "").toLowerCase() !== "trash" && (
                      <button
                        className="trash-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveMailToTrashOnly(mail.id);
                        }}
                        title="Move to Trash"
                        style={{
                          marginLeft: "0.5rem",
                          backgroundColor: "#f8d7da",
                          color: "#721c24",
                          border: "1px solid #f5c6cb",
                          borderRadius: "4px",
                          padding: "4px 8px",
                          cursor: "pointer",
                        }}
                      >
                        <FaTrash />
                      </button>
                    )}

                    {(labelName || "").toLowerCase() !== "trash" &&
                      openLabelManagement[mail.id] && (
                        <button
                          className="move-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveToLabels(mail.id);
                          }}
                          style={{
                            backgroundColor: "#e8f0fe",
                            color: "#174ea6",
                            border: "1px solid #c6dafc",
                            padding: "4px 8px",
                            fontSize: "0.8rem",
                            borderRadius: "4px",
                            cursor: "pointer",
                            marginRight: "0.5rem",
                          }}
                        >
                          Apply Changes
                        </button>
                      )}

                    {(labelName || "").toLowerCase() === "trash" && (
                      <button
                        className="delete-button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await fetch(`/api/mails/${mail.id}`, {
                              method: "DELETE",
                              headers: {
                                Authorization: `Bearer ${token}`,
                              },
                            });
                            // optimistic UI update
                            setMails((prev) =>
                              prev.filter((m) => m.id !== mail.id)
                            );
                          } catch (err) {
                            console.error("Failed to delete mail:", err);
                            alert("Failed to delete mail.");
                          }
                        }}
                        style={{
                          marginLeft: "0.5rem",
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          padding: "4px 8px",
                          cursor: "pointer",
                        }}
                      >
                        Delete Forever
                      </button>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default LabelPage;
