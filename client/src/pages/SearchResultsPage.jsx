// client/src/pages/SearchResultsPage.jsx
// Enhanced search results page with proper draft detection logic

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
  if (typeof v === "string") {
    const m = v.match(/<([^>]+)>/);
    const addr = m ? m[1] : v;
    return addr.toLowerCase().trim();
  }
  if (typeof v === "object" && v.email) {
    return v.email.toLowerCase().trim();
  }
  if (Array.isArray(v) && v.length > 0) {
    return extractEmail(v[0]);
  }
  return "";
};

// Format date like Gmail - shows time for today, date for older emails
const formatDate = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mailDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // If today - show time (e.g., "2:30 PM")
  if (mailDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // If yesterday - show "Yesterday"
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (mailDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }
  
  // If this week - show day name (e.g., "Mon")
  const dayDiff = Math.floor((today.getTime() - mailDate.getTime()) / (1000 * 60 * 60 * 24));
  if (dayDiff < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  
  // If this year - show month and day (e.g., "Aug 15")
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  
  // If older - show full date (e.g., "8/15/23")
  return date.toLocaleDateString([], { year: '2-digit', month: 'numeric', day: 'numeric' });
};

const SearchResultsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get("q") || "";
  
  const [results, setResults] = useState([]);
  const [selectedMails, setSelectedMails] = useState(new Set());
  const [isLoading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  // Draft detection state - copied from LabelPage
  const [allLabels, setAllLabels] = useState([]);
  const [draftLabelId, setDraftLabelId] = useState(null);
  const [labelsReady, setLabelsReady] = useState(false);
  const [currentMailLabels, setCurrentMailLabels] = useState({});
  
  const token = localStorage.getItem("token");
  const myEmail = emailFromToken(token);
  
  const mailsPerPage = 50;
  
  const draftLabelCacheRef = useRef(new Map());
  const inflightRef = useRef(new Map());

  // Helper functions for draft detection - copied from LabelPage
  const getDraftLabelId = (labelsList) => {
    const drafts = (labelsList || []).find(
      (l) => (l.name || "").toLowerCase() === "drafts"
    );
    return drafts ? drafts.id : null;
  };

  const hasNameDraft = (labelsOrNames) => {
    if (!Array.isArray(labelsOrNames)) return false;
    return labelsOrNames.some(
      (x) => typeof x === "string" && normalize(x) === "drafts"
    );
  };

  const includesId = (arr, id) =>
    Array.isArray(arr) && id != null ? arr.includes(id) : false;

  const isDraftMailRobust = (mail) => {
    console.log(`[SearchResults] Checking if mail ${mail?.id} is draft:`, {
      mailIsDraft: mail?.isDraft,
      mailLabels: mail?.labels,
      draftLabelId,
      currentMailLabels: currentMailLabels[mail?.id],
      __isDraft: mail?.__isDraft
    });

    if (mail?.isDraft === true) {
      console.log(`[SearchResults] Mail ${mail?.id} is draft (isDraft=true)`);
      return true;
    }
    if (Array.isArray(mail?.labels)) {
      if (draftLabelId && includesId(mail.labels, draftLabelId)) {
        console.log(`[SearchResults] Mail ${mail?.id} is draft (has draftLabelId in labels)`);
        return true;
      }
      if (hasNameDraft(mail.labels)) {
        console.log(`[SearchResults] Mail ${mail?.id} is draft (has 'drafts' name in labels)`);
        return true;
      }
    }
    const idsForMail = currentMailLabels[mail?.id] || [];
    if (draftLabelId && includesId(idsForMail, draftLabelId)) {
      console.log(`[SearchResults] Mail ${mail?.id} is draft (has draftLabelId in currentMailLabels)`);
      return true;
    }
    if (mail?.__isDraft === true) {
      console.log(`[SearchResults] Mail ${mail?.id} is draft (__isDraft=true)`);
      return true;
    }
    
    console.log(`[SearchResults] Mail ${mail?.id} is NOT draft`);
    return false;
  };

  // Check if mail is draft by server labels - same as existing logic but with more logging
  const checkIsDraftByServerLabels = async (mailId) => {
    if (!mailId || !token) {
      console.log(`[SearchResults] checkIsDraftByServerLabels: missing mailId or token`);
      return false;
    }
    
    const cache = draftLabelCacheRef.current;
    if (cache.has(mailId)) {
      const cached = cache.get(mailId);
      console.log(`[SearchResults] checkIsDraftByServerLabels: cached result for ${mailId}: ${cached}`);
      return cached;
    }

    const inflight = inflightRef.current;
    if (inflight.has(mailId)) {
      console.log(`[SearchResults] checkIsDraftByServerLabels: waiting for inflight request for ${mailId}`);
      return inflight.get(mailId);
    }

    const p = (async () => {
      try {
        console.log(`[SearchResults] checkIsDraftByServerLabels: fetching labels for mail ${mailId}`);
        const res = await fetch(`/api/labels/mail/${mailId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          console.log(`[SearchResults] checkIsDraftByServerLabels: failed to fetch labels for ${mailId}: ${res.status}`);
          return false;
        }

        const arr = await res.json();
        console.log(`[SearchResults] checkIsDraftByServerLabels: labels for mail ${mailId}:`, arr);
        
        if (!Array.isArray(arr)) {
          console.log(`[SearchResults] checkIsDraftByServerLabels: labels not array for ${mailId}`);
          return false;
        }

        let result = false;
        if (arr.length && typeof arr[0] === "object") {
          result = arr.some(
            (l) =>
              normalize(l?.name) === "drafts" ||
              (draftLabelId != null && String(l?.id) === String(draftLabelId))
          );
          console.log(`[SearchResults] checkIsDraftByServerLabels: object labels check for ${mailId}: ${result}`);
        } else if (arr.length && typeof arr[0] === "string") {
          const names = arr.map(normalize);
          console.log(`[SearchResults] checkIsDraftByServerLabels: string labels for ${mailId}:`, names);
          if (names.includes("drafts")) {
            result = true;
            console.log(`[SearchResults] checkIsDraftByServerLabels: found 'drafts' name for ${mailId}`);
          } else if (draftLabelId != null) {
            result = arr.map(String).includes(String(draftLabelId));
            console.log(`[SearchResults] checkIsDraftByServerLabels: draftLabelId check for ${mailId}: ${result}`);
          }
        }

        cache.set(mailId, result);
        console.log(`[SearchResults] checkIsDraftByServerLabels: final result for ${mailId}: ${result}`);
        return result;
      } catch (error) {
        console.error(`[SearchResults] checkIsDraftByServerLabels: error for ${mailId}:`, error);
        return false;
      } finally {
        inflight.delete(mailId);
      }
    })();

    inflight.set(mailId, p);
    return p;
  };

  // Load labels - copied from LabelPage
  useEffect(() => {
    if (!token) return;

    console.log('[SearchResults] Loading labels...');
    
    fetchWithAuth("/labels", token)
      .then((list) => {
        console.log('[SearchResults] Labels loaded:', list);
        setAllLabels(list);
        setDraftLabelId(getDraftLabelId(list));
        setLabelsReady(true);
      })
      .catch((e) => {
        console.error('[SearchResults] Failed to load labels:', e);
        setLabelsReady(true);
      });
  }, [token]);

  // Load current mail labels - copied from LabelPage logic
  useEffect(() => {
    if (!results.length || !token) return;

    console.log('[SearchResults] Loading current mail labels for', results.length, 'mails...');

    const loadMailLabels = async () => {
      const mailLabelsMap = {};
      for (const mail of results) {
        try {
          const res = await fetch(`/api/labels/mail/${mail.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const labels = res.ok ? await res.json() : [];
          mailLabelsMap[mail.id] = Array.isArray(labels) ? labels : [];
          console.log(`[SearchResults] Labels for mail ${mail.id}:`, mailLabelsMap[mail.id]);
        } catch (err) {
          console.error(`[SearchResults] Error loading labels for mail ${mail.id}:`, err);
          mailLabelsMap[mail.id] = [];
        }
      }
      setCurrentMailLabels(mailLabelsMap);
    };

    loadMailLabels();
  }, [results, token]);

  // Load search results - improved error handling and draft detection
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
        console.log('[SearchResults] Starting search for:', query);
        
        const tryFetch = async (path) => {
          return await fetchWithAuth(
            `${path}?q=${encodeURIComponent(query)}&ts=${Date.now()}`,
            token
          );
        };

        let data;
        try {
          data = await tryFetch("/mails/search");
          console.log('[SearchResults] Search results from /mails/search:', data);
        } catch (e1) {
          try {
            data = await tryFetch("/search");
            console.log('[SearchResults] Search results from /search:', data);
          } catch (e2) {
            // If both endpoints fail, still try to handle empty results gracefully
            console.warn("[SearchResults] Both search endpoints failed:", e1, e2);
            data = [];
          }
        }

        const raw = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : [];

        console.log('[SearchResults] Raw search results:', raw);

        // Wait for labels to be ready before processing drafts
        if (!labelsReady) {
          console.log('[SearchResults] Labels not ready yet, waiting...');
          // We'll process this again when labelsReady becomes true
          return;
        }

        // Enrich with draft detection - same as existing logic but with more logging
        console.log('[SearchResults] Enriching results with draft detection...');
        const enriched = await Promise.all(
          raw.map(async (m) => {
            const __isDraft = await checkIsDraftByServerLabels(m?.id);
            const enrichedMail = {
              ...m,
              isDraft: m?.isDraft === true,
              hasLabels: Array.isArray(m.labels),
              hasLabelIds: Array.isArray(m.labelIds),
              __isDraft,
            };
            console.log(`[SearchResults] Enriched mail ${m?.id}:`, {
              isDraft: enrichedMail.isDraft,
              __isDraft: enrichedMail.__isDraft,
              hasLabels: enrichedMail.hasLabels,
              labels: m.labels
            });
            return enrichedMail;
          })
        );

        if (!dead) {
          // Sort results by timestamp - newest first (like Gmail)
          const sortedResults = enriched.sort((a, b) => {
            const dateA = new Date(a.timestamp || 0);
            const dateB = new Date(b.timestamp || 0);
            return dateB.getTime() - dateA.getTime(); // Newest first
          });
          
          console.log('[SearchResults] Final sorted results:', sortedResults);
          setResults(sortedResults);
          setCurrentPage(1);
        }
      } catch (e) {
        console.error("[SearchResults] error:", e);
        if (!dead) {
          // Only set error for actual technical failures, not empty results
          setErr("Connection error. Please try again.");
          setResults([]);
        }
      } finally {
        if (!dead) setLoading(false);
      }
    };

    run();
    return () => { dead = true; };
  }, [query, token, labelsReady, draftLabelId, myEmail]);

  // Open mail item - enhanced with proper draft detection
  const openItem = (m) => {
    if (!m?.id) {
      console.log('[SearchResults] openItem: no mail ID');
      return;
    }
    
    const isDraft = isDraftMailRobust(m);
    console.log(`[SearchResults] openItem: opening mail ${m.id}, isDraft: ${isDraft}`);
    
    if (isDraft) {
      console.log(`[SearchResults] openItem: navigating to draft editor for ${m.id}`);
      navigate(`/draft/${m.id}`, { state: { assumeDraft: true } });
    } else {
      console.log(`[SearchResults] openItem: navigating to mail view for ${m.id}`);
      navigate(`/mail/${m.id}`);
    }
  };

  // Pagination calculations - same as existing
  const totalPages = Math.ceil(results.length / mailsPerPage);
  const startIndex = (currentPage - 1) * mailsPerPage;
  const endIndex = startIndex + mailsPerPage;
  const paginatedResults = results.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setSelectedMails(new Set()); // Clear selections when changing pages
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  // Transform search results to mail format for consistency with existing components
  const transformedMails = paginatedResults.map(mail => ({
    ...mail,
    // Ensure compatibility with existing mail display logic
    sender: mail.sender || mail.from,
    direction: extractEmail(mail.sender || mail.from) === myEmail ? "sent" : "received",
    preview: mail.preview || mail.content?.slice(0, 100) || "",
    labels: ["search-result"], // Add search result indicator
    isRead: false, // Search results should appear unread for visibility
  }));

  return (
    <div className="gmail-main-area">
      {/* Reuse existing Gmail toolbar structure from LabelPage */}
      <div className="gmail-toolbar">
        <div className="gmail-toolbar-left">
          <div className="gmail-select-all-container">
            <input
              type="checkbox"
              onChange={(e) => {
                const allCurrentIds = transformedMails.map(m => m.id);
                if (e.target.checked) {
                  setSelectedMails(new Set([...selectedMails, ...allCurrentIds]));
                } else {
                  const newSelected = new Set(selectedMails);
                  allCurrentIds.forEach(id => newSelected.delete(id));
                  setSelectedMails(newSelected);
                }
              }}
              checked={transformedMails.length > 0 && transformedMails.every(mail => selectedMails.has(mail.id))}
              title="Select all on this page"
            />
          </div>
          
          {selectedMails.size > 0 && (
            <span className="gmail-selection-count">
              {selectedMails.size} selected
            </span>
          )}
        </div>

        <div className="gmail-toolbar-right">
          <button 
            className="gmail-refresh-btn"
            onClick={() => window.location.reload()}
            title="Refresh"
          >
            ↻
          </button>
          
          {/* Reuse existing pagination structure */}
          {results.length > 0 && (
            <div className="gmail-pagination">
              <span className="gmail-results-info">
                {`${startIndex + 1}-${Math.min(endIndex, results.length)} of ${results.length}`}
              </span>
              <button 
                onClick={goToPreviousPage}
                disabled={currentPage <= 1}
                title="Previous page"
              >
                ‹
              </button>
              <button 
                onClick={goToNextPage}
                disabled={currentPage >= totalPages}
                title="Next page"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search header with same styling as existing pages */}
      <div style={{ 
        padding: '16px 20px', 
        borderBottom: '1px solid var(--border, #e0e4e7)',
        background: 'var(--surface, #ffffff)'
      }}>
        <h1 style={{ 
          fontSize: '20px', 
          fontWeight: '400', 
          margin: '0', 
          color: 'var(--text, #202124)' 
        }}>
          Search results for: "<strong>{query}</strong>"
        </h1>
        {results.length > 0 && (
          <p style={{ 
            color: 'var(--muted, #5f6368)', 
            fontSize: '14px', 
            margin: '4px 0 0 0' 
          }}>
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      {/* Mail list container with same structure as LabelPage */}
      <div className="gmail-mail-list-container">
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Loading label="Searching…" />
          </div>
        ) : err ? (
          <div style={{ 
            padding: '60px 20px', 
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>
              ⚠️
            </div>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '400', 
              margin: '0 0 8px 0', 
              color: 'var(--error, #ea4335)' 
            }}>
              {err}
            </h3>
            <button 
              onClick={() => window.location.reload()} 
              style={{
                background: 'var(--accent, #1a73e8)',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                marginTop: '8px'
              }}
            >
              Try Again
            </button>
          </div>
        ) : transformedMails.length === 0 ? (
          <div style={{ 
            padding: '60px 20px', 
            textAlign: 'center', 
            color: 'var(--muted, #5f6368)',
            fontSize: '16px',
            lineHeight: '1.5'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>
              🔍
            </div>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '400', 
              margin: '0 0 8px 0', 
              color: 'var(--text, #202124)' 
            }}>
              No results found
            </h3>
            <p style={{ margin: '0', color: 'var(--muted, #5f6368)' }}>
              Try different keywords or check your spelling
            </p>
          </div>
        ) : (
          // Reuse existing mail list structure - this will automatically use existing CSS
          <div className="gmail-mail-list">
            {transformedMails.map((mail) => {
              const isSelected = selectedMails.has(mail.id);
              const isDraft = isDraftMailRobust(mail);
              const isRead = false; // Search results appear unread
              
              // Use same sender info logic as LabelPage
              let senderInfo = "";
              if (isDraft) {
                senderInfo = "Draft";
              } else {
                const senderEmail = extractEmail(mail.sender);
                senderInfo = senderEmail === myEmail ? "me" : senderEmail || "(unknown)";
              }

              console.log(`[SearchResults] Rendering mail ${mail.id}: isDraft=${isDraft}, senderInfo="${senderInfo}"`);

              return (
                <div
                  key={mail.id}
                  className={`gmail-mail-item ${isSelected ? 'selected' : ''} ${isRead ? 'read' : 'unread'} ${isDraft ? 'is-draft' : ''}`}
                  onClick={() => openItem(mail)}
                >
                  <div className="gmail-mail-item-content">
                    {/* Checkbox - same as LabelPage */}
                    <div className="gmail-mail-checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          const newSelected = new Set(selectedMails);
                          if (newSelected.has(mail.id)) {
                            newSelected.delete(mail.id);
                          } else {
                            newSelected.add(mail.id);
                          }
                          setSelectedMails(newSelected);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Star - same as LabelPage */}
                    <div className="gmail-mail-star">
                      ☆
                    </div>

                    {/* Sender - same styling as LabelPage */}
                    <div className="gmail-mail-sender">
                      {senderInfo}
                      {isDraft && <span style={{ color: 'var(--muted)', fontSize: '12px' }}> Draft</span>}
                    </div>

                    {/* Subject and preview - same as LabelPage */}
                    <div className="gmail-mail-subject-content">
                      <span className="gmail-mail-subject">
                        {mail.subject || "(no subject)"}
                      </span>
                      <span className="gmail-mail-preview">
                        {mail.preview || mail.content?.slice(0, 100) || "(no content)"}
                      </span>
                    </div>

                    {/* Labels - show search result indicator */}
                    <div className="gmail-mail-labels">
                      <span className="gmail-label-chip search-result">
                        Search Result
                      </span>
                    </div>

                    {/* Date - Gmail-style formatting */}
                    <div className="gmail-mail-date">
                      {formatDate(mail.timestamp)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom pagination - same as LabelPage */}
        {results.length > mailsPerPage && (
          <div className="gmail-pagination" style={{ 
            margin: '24px 0 0 0', 
            justifyContent: 'center',
            padding: '16px',
            borderTop: '1px solid var(--border, #e0e4e7)'
          }}>
            <button 
              onClick={goToPreviousPage}
              disabled={currentPage <= 1}
              title="Previous page"
            >
              ‹ Previous
            </button>
            <span style={{ margin: '0 16px', color: 'var(--text, #202124)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
              title="Next page"
            >
              Next ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsPage;