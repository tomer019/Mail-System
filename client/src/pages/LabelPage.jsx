// LabelPage.jsx - Merged version combining both UI improvements and custom label logic

import { FaTrash, FaArchive, FaTag, FaStar, FaRegStar } from "react-icons/fa";
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

  // Read status tracking
  const [readMails, setReadMails] = useState(new Set());

  // Label detection helpers
  const [draftLabelId, setDraftLabelId] = useState(null);
  const [starredLabelId, setStarredLabelId] = useState(null);
  const [labelsReady, setLabelsReady] = useState(false);

  // Mail management state
  const [currentMailLabels, setCurrentMailLabels] = useState({});
  const [openLabelManagement, setOpenLabelManagement] = useState({});
  const [pendingLabelChanges, setPendingLabelChanges] = useState({});

  // Selection functionality
  const [selectedMails, setSelectedMails] = useState(new Set());
  const [isBulkOperationInProgress, setIsBulkOperationInProgress] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const mailsPerPage = 50;

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // Get current user email from JWT
  const currentUserEmail = React.useMemo(() => {
    try {
      const jwt = String(token || "");
      const base64 = jwt.split(".")[1];
      if (!base64) return "";
      const json = JSON.parse(atob(base64.replace(/-/g, "+").replace(/_/g, "/")));
      const e = json.email || json.user?.email || json.username || json.sub || "";
      return String(e).trim().toLowerCase();
    } catch {
      return String(localStorage.getItem("userEmail") || "").trim().toLowerCase();
    }
  }, [token]);

  // Normalize email helper
  const emailOf = (p) => {
    if (!p) return "";
    if (typeof p === "string") return p.trim().toLowerCase();
    return String(p.email || "").trim().toLowerCase();
  };

  // Load read mails from localStorage
  useEffect(() => {
    const loadReadMails = () => {
      const stored = localStorage.getItem('readMails');
      if (stored) {
        try {
          const readArray = JSON.parse(stored);
          setReadMails(new Set(readArray));
        } catch (e) {
          console.error('Error loading read mails:', e);
          setReadMails(new Set());
        }
      }
    };
    loadReadMails();

    const handleStorageChange = (e) => {
      if (e.key === 'readMails') loadReadMails();
    };
    const handleReadMailUpdate = () => loadReadMails();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('readMailsUpdated', handleReadMailUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('readMailsUpdated', handleReadMailUpdate);
    };
  }, []);

  // Mark mail as read
  const markAsRead = (mailId) => {
    setReadMails(prev => {
      const newSet = new Set([...prev, mailId]);
      const newArray = Array.from(newSet);
      localStorage.setItem('readMails', JSON.stringify(newArray));
      window.dispatchEvent(new CustomEvent('readMailsUpdated'));
      return newSet;
    });
  };

  // Helper functions
  const normalize = (text) => (text || "").toString().trim().toLowerCase();

  const getDraftLabelId = (labelsList) => {
    const drafts = (labelsList || []).find(
      (l) => (l.name || "").toLowerCase() === "drafts"
    );
    return drafts ? drafts.id : null;
  };

  const getStarredLabelId = (labelsList) => {
    const starred = (labelsList || []).find(
      (l) => (l.name || "").toLowerCase() === "starred"
    );
    return starred ? starred.id : null;
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
    if (mail?.isDraft === true) return true;
    if (Array.isArray(mail?.labels)) {
      if (draftLabelId && includesId(mail.labels, draftLabelId)) return true;
      if (hasNameDraft(mail.labels)) return true;
    }
    const idsForMail = currentMailLabels[mail?.id] || [];
    if (draftLabelId && includesId(idsForMail, draftLabelId)) return true;
    if (normalize(labelName) === "drafts" || normalize(labelId) === "drafts")
      return true;
    return false;
  };

  // Check if mail is starred
  const isMailStarred = (mail) => {
    if (!starredLabelId || !mail?.id) return false;
    const idsForMail = currentMailLabels[mail.id] || [];
    return idsForMail.includes(starredLabelId);
  };

  // Enhanced ensureLabelIdByName - combines both approaches
  const ensureLabelIdByName = async (name) => {
    const wanted = String(name || "").trim().toLowerCase();
    if (!wanted) throw new Error("Invalid label name");

    // 1) First, try to refresh the full list of labels
    try {
      const labelsRes = await fetch("/api/labels", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (labelsRes.ok) {
        const freshLabels = await labelsRes.json();
        setAllLabels(freshLabels);

        // Check if the label already exists in the fresh list
        const found = freshLabels.find(
          (l) => (l.name || "").toLowerCase() === wanted
        );
        if (found) return found.id;
      }
    } catch (refreshErr) {
      console.warn("Failed to refresh labels:", refreshErr);
    }

    // 2) Check local list as backup
    const exists = (allLabels || []).find(
      (l) => (l.name || "").toLowerCase() === wanted
    );
    if (exists) return exists.id;

    // 3) Determine if we should create the label
    const systemLabels = ['inbox', 'sent', 'trash', 'spam', 'drafts', 'starred'];
    const isSystemLabel = systemLabels.includes(wanted);

    // For system labels, always try to create
    // For custom labels, only create if this is a user-initiated action
    if (!isSystemLabel) {
      // Check if this is being called from a system context vs user context
      // For now, allow creation of custom labels
      console.log(`Attempting to create custom label: ${wanted}`);
    }

    try {
      const res = await fetch("/api/labels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: wanted }),
      });

      if (res.ok) {
        const created = await res.json();
        setAllLabels((prev) => [...prev, created]);
        return created.id;
      }

      // Handle creation failure
      let errorMsg = `Failed to create label '${wanted}' (${res.status})`;
      try {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const errorData = await res.json();
          if (errorData?.error) {
            errorMsg = errorData.error;
            // If label already exists, refresh again and try to find it
            if (errorData.error.includes("already exists")) {
              try {
                const retryRes = await fetch("/api/labels", {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (retryRes.ok) {
                  const retryLabels = await retryRes.json();
                  setAllLabels(retryLabels);
                  const foundAfterRetry = retryLabels.find(
                    (l) => (l.name || "").toLowerCase() === wanted
                  );
                  if (foundAfterRetry) return foundAfterRetry.id;
                }
              } catch (retryErr) {
                console.warn("Retry after 'already exists' failed:", retryErr);
              }
            }
          }
        }
      } catch (parseErr) {
        console.warn("Failed to parse error response:", parseErr);
      }

      throw new Error(errorMsg);

    } catch (createErr) {
      console.error("Error in ensureLabelIdByName:", createErr);
      throw createErr;
    }
  };

  const resolveSystemLabelId = async (nameLower) => {
    const nm = String(nameLower || "").toLowerCase();

    // Always refresh before system labels
    try {
      const labelsRes = await fetch("/api/labels", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (labelsRes.ok) {
        const freshLabels = await labelsRes.json();
        setAllLabels(freshLabels);

        const found = freshLabels.find(
          (l) => (l.name || "").toLowerCase() === nm
        );
        if (found) return found.id;
      }
    } catch (refreshErr) {
      console.warn("Failed to refresh labels in resolveSystemLabelId:", refreshErr);
    }

    // Backup - check local list
    const found = (allLabels || []).find(
      (l) => (l.name || "").toLowerCase() === nm
    );
    if (found) return found.id;

    // Try to create the label
    return await ensureLabelIdByName(nm);
  };

  // Open mail and mark as read
  const safeOpenMail = (mail) => {
    if (!labelsReady && mail?.isDraft !== true) {
      return;
    }

    markAsRead(mail.id);

    if (isDraftMailRobust(mail)) {
      navigate(`/draft/${mail.id}`);
      return;
    }
    navigate(`/mail/${mail.id}`);
  };

  // Toggle starred status
  const toggleStarred = async (mailId, event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!starredLabelId || !mailId) {
      console.warn('Cannot toggle starred: missing starredLabelId or mailId');
      return;
    }

    try {
      const currentLabels = currentMailLabels[mailId] || [];
      const isCurrentlyStarred = currentLabels.includes(starredLabelId);

      if (isCurrentlyStarred) {
        const response = await fetch("/api/labels/untag", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ mailId, labelId: starredLabelId }),
        });

        if (response.ok) {
          setCurrentMailLabels(prev => ({
            ...prev,
            [mailId]: currentLabels.filter(id => id !== starredLabelId)
          }));
        }
      } else {
        const response = await fetch("/api/labels/tag", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ mailId, labelId: starredLabelId }),
        });

        if (response.ok) {
          setCurrentMailLabels(prev => ({
            ...prev,
            [mailId]: [...currentLabels, starredLabelId]
          }));
        }
      }
    } catch (error) {
      console.error('Error toggling starred status:', error);
    }
  };

  // Selection functions
  const toggleMailSelection = (mailId, event) => {
    event.preventDefault();
    event.stopPropagation();

    setSelectedMails(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(mailId)) {
        newSelected.delete(mailId);
      } else {
        newSelected.add(mailId);
      }
      return newSelected;
    });
  };

  const toggleSelectAll = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const visibleMailIds = filteredMails.map(mail => mail.id);
    const allVisibleSelected = visibleMailIds.every(id => selectedMails.has(id));

    if (allVisibleSelected) {
      // Deselect all visible
      setSelectedMails(prev => {
        const newSelected = new Set(prev);
        visibleMailIds.forEach(id => newSelected.delete(id));
        return newSelected;
      });
    } else {
      // Select all visible
      setSelectedMails(prev => {
        const newSelected = new Set(prev);
        visibleMailIds.forEach(id => newSelected.add(id));
        return newSelected;
      });
    }
  };

  const areAllVisibleSelected = () => {
    if (filteredMails.length === 0) return false;
    return filteredMails.every(mail => selectedMails.has(mail.id));
  };

  // Bulk move to trash
  const moveSelectedMailsToTrash = async () => {
    if (selectedMails.size === 0) return;

    setIsBulkOperationInProgress(true);

    try {
      const trashId = await ensureLabelIdByName("trash");
      const selectedMailIds = Array.from(selectedMails);

      const results = await Promise.allSettled(
        selectedMailIds.map(async (mailId) => {
          try {
            const res = await fetch(`/api/labels/mail/${mailId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            const currentLabels = res.ok ? await res.json() : [];
            const safeCurrent = Array.isArray(currentLabels) ? currentLabels : [];

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

            const tagRes = await fetch(`/api/labels/tag`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ mailId, labelId: trashId }),
            });

            if (!tagRes.ok) {
              throw new Error(`Failed to tag mail ${mailId} with trash`);
            }

            return { mailId, success: true };
          } catch (error) {
            console.error(`Error moving mail ${mailId} to trash:`, error);
            return { mailId, success: false, error: error.message };
          }
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
      const successfulMailIds = successful.map(r => r.value.mailId);

      setMails(prev => prev.filter(m => !successfulMailIds.includes(m.id)));

      setCurrentMailLabels(prev => {
        const updated = { ...prev };
        successfulMailIds.forEach(mailId => {
          updated[mailId] = [trashId];
        });
        return updated;
      });

      setSelectedMails(new Set());

    } catch (error) {
      console.error("Error in bulk trash operation:", error);
    } finally {
      setIsBulkOperationInProgress(false);
    }
  };

  // Handle mail item click
  const handleMailItemClick = (mail, event) => {
    if (
      event.target.closest('.gmail-mail-star') ||
      event.target.closest('.gmail-mail-actions') ||
      event.target.closest('.gmail-mail-checkbox') ||
      event.target.closest('.gmail-label-management-popup')
    ) {
      return;
    }

    safeOpenMail(mail);
  };

  // Format date like Gmail
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString([], { year: '2-digit', month: 'short', day: 'numeric' });
    }
  };

  // Get mail labels for display
  const getMailLabels = (mail) => {
    const labelIds = currentMailLabels[mail?.id] || [];
    return labelIds.map(id => {
      const label = allLabels.find(l => l.id === id);
      return label || { id, name: `Label ${id}` };
    }).filter(label =>
      label.name.toLowerCase() !== 'inbox' &&
      label.name.toLowerCase() !== 'starred'
    );
  };

  // Update pending label changes
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
  }, [openLabelManagement, currentMailLabels, pendingLabelChanges]);

  // Action handlers
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

      navigate("/label/drafts", { replace: true, state: { justDeletedId: mailId, ts: Date.now() } });
    } catch (e) {
      console.error(e);
      alert("Failed to discard draft.");
    }
  };

  const moveMailToTrashOnly = async (mailId) => {
    try {
      const trashId = await ensureLabelIdByName("trash");

      const res = await fetch(`/api/labels/mail/${mailId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`labels fetch failed ${res.status}`);
      const currentLabels = await res.json();
      const safeCurrent = Array.isArray(currentLabels) ? currentLabels : [];

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

      const tagRes = await fetch(`/api/labels/tag`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mailId, labelId: trashId }),
      });
      if (!tagRes.ok) throw new Error(`tag trash failed ${tagRes.status}`);

      setMails((prev) => prev.filter((m) => m.id !== mailId));
      setCurrentMailLabels((prev) => ({ ...prev, [mailId]: [trashId] }));
    } catch (err) {
      console.error("Error moving mail to trash:", err);
      alert(err.message || "Failed to move mail to trash");
    }
  };

  // Handle deleted drafts
  useEffect(() => {
    const deletedId = location.state?.justDeletedId;
    if (!deletedId) return;

    setMails((prev) => prev.filter((m) => m.id !== deletedId));
    setCurrentMailLabels((prev) => {
      const next = { ...prev };
      delete next[deletedId];
      return next;
    });

    navigate(location.pathname, { replace: true, state: null });
  }, [location.state?.justDeletedId, location.pathname, navigate]);

  // Filter and sort mails first
  const allFilteredMails = mails
    .filter((mail) => {
      const search = normalize(searchQuery);
      if (search === "") return true;

      const sender = typeof mail.sender === "string" ? normalize(mail.sender) : normalize(mail.sender?.email || "");
      const recipient = typeof mail.recipient === "string" ? normalize(mail.recipient) : normalize(mail.recipient?.email || "");
      const subject = normalize(mail.subject);
      const content = normalize(mail.content);

      return (
        subject.includes(search) ||
        content.includes(search) ||
        sender.includes(search) ||
        recipient.includes(search)
      );
    })
    .sort((a, b) => {
      // Sort by timestamp in descending order (newest first)
      const dateA = new Date(a.timestamp || 0);
      const dateB = new Date(b.timestamp || 0);
      return dateB.getTime() - dateA.getTime();
    });

  // Calculate pagination
  const totalPages = Math.ceil(allFilteredMails.length / mailsPerPage);
  const startIndex = (currentPage - 1) * mailsPerPage;
  const endIndex = startIndex + mailsPerPage;

  // Apply pagination to get current page mails
  const filteredMails = allFilteredMails.slice(startIndex, endIndex);

  // Reset to page 1 when search changes or label changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedMails(new Set());
  }, [searchQuery, labelId]);

  // Pagination functions
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

  // Main data loading effect
  useEffect(() => {
    setMails([]);
    setCurrentMailLabels({});
    setSelectedMails(new Set());
    setOpenLabelManagement({});
    setPendingLabelChanges({});
    setError("");
    setSearchQuery("");

    if (!token) return;

    const sysNames = new Set(["inbox", "sent", "trash", "spam", "drafts", "starred"]);
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

          const list = labelId === "inbox" ? (data?.inbox || []) : (data?.sent || []);

          // Filter by user role
          let roleFiltered = list;
          if (currentUserEmail) {
            if (labelId === "inbox") {
              roleFiltered = list.filter((m) => emailOf(m.recipient) === currentUserEmail);
            } else {
              roleFiltered = list.filter((m) => emailOf(m.sender) === currentUserEmail);
            }
          }

          const prelim = roleFiltered.filter(
            (m) => m?.isDraft !== true && !hasNameDraft(m?.labels || [])
          );

          // Filter out trash by querying label names
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
              if (!names.includes("trash") && !names.includes("spam")) final.push(mail);
            } catch {
              final.push(mail);
            }
          }
          validMails = final;

        } else if (String(labelId).toLowerCase() === "starred") {
          try {
            const starredId = await resolveSystemLabelId("starred");
            const ids = await fetchWithAuth(`/labels/by-label/${starredId}`, token);
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
          } catch (err) {
            console.error("Error fetching starred mails:", err);
            validMails = [];
          }

        } else if (String(labelId).toLowerCase() === "trash") {
          try {
            const trashId = await resolveSystemLabelId("trash");
            const ids = await fetchWithAuth(`/labels/by-label/${trashId}`, token);
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
          } catch (err) {
            console.error("Error fetching trash mails:", err);
            validMails = [];
          }

        } else if (String(labelId).toLowerCase() === "spam") {
          try {
            const spamId = await resolveSystemLabelId("spam");
            const ids = await fetchWithAuth(`/labels/by-label/${spamId}`, token);
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
          } catch (err) {
            console.error("Error fetching spam mails:", err);
            validMails = [];
          }

        } else if (String(labelId).toLowerCase() === "drafts") {
          try {
            const draftsId = await resolveSystemLabelId("drafts");
            const ids = await fetchWithAuth(`/labels/by-label/${draftsId}`, token);
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
          } catch (err) {
            console.error("Error fetching drafts mails:", err);
            validMails = [];
          }

        } else {
          // Handle custom user labels
          try {
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
          } catch (err) {
            console.error("Error fetching label mails:", err);
            validMails = [];
          }
        }

        // Sort all mails by timestamp (newest first) before storing
        const sortedMails = validMails.sort((a, b) => {
          const dateA = new Date(a.timestamp || 0);
          const dateB = new Date(b.timestamp || 0);
          return dateB.getTime() - dateA.getTime();
        });

        setMails(sortedMails);

        const mailLabelsMap = {};
        for (const mail of sortedMails) {
          try {
            const res = await fetch(`/api/labels/mail/${mail.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const labels = res.ok ? await res.json() : [];
            mailLabelsMap[mail.id] = Array.isArray(labels) ? labels : [];
          } catch (err) {
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
    setError("");
    fetchMails().finally(() => setLoading(false));

    // Load labels and mark ready
    fetchWithAuth("/labels", token)
      .then((list) => {
        setAllLabels(list);
        setDraftLabelId(getDraftLabelId(list));

        const existingStarred = getStarredLabelId(list);
        if (existingStarred) {
          setStarredLabelId(existingStarred);
          setLabelsReady(true);
        } else {
          ensureLabelIdByName("starred")
            .then((id) => {
              setStarredLabelId(id);
              setLabelsReady(true);
            })
            .catch((e) => {
              console.error("Failed to create starred label:", e);
              setLabelsReady(true);
            });
        }
      })
      .catch((e) => {
        console.error(e);
        setLabelsReady(true);
      });
  }, [labelId, token, setSearchQuery]);

  return (
    <div className="gmail-main-area">
      {loading ? (
        <Loading label="Loading Mails…" />
      ) : error ? (
        <p style={{ color: "red", padding: "1rem" }}>{error}</p>
      ) : (
        <>
          {/* Toolbar with selection functionality */}
          <div className="gmail-toolbar">
            <div className="gmail-toolbar-left">
              <div className="gmail-checkbox-all">
                <div
                  onClick={toggleSelectAll}
                  title={areAllVisibleSelected() ? "Deselect all" : "Select all"}
                  style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid #dadce0',
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backgroundColor: areAllVisibleSelected() ? '#1a73e8' : 'transparent',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {areAllVisibleSelected() ? '✓' : ''}
                </div>
              </div>

              {selectedMails.size > 0 && (labelName || "").toLowerCase() !== "trash" && (
                <button
                  onClick={moveSelectedMailsToTrash}
                  disabled={isBulkOperationInProgress}
                  style={{
                    marginLeft: '12px',
                    padding: '8px 12px',
                    background: isBulkOperationInProgress ? '#ccc' : '#d93025',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isBulkOperationInProgress ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px'
                  }}
                >
                  <FaTrash />
                  {isBulkOperationInProgress ? 'Moving...' : `Move to Trash (${selectedMails.size})`}
                </button>
              )}

              <button className="gmail-refresh-btn" onClick={() => window.location.reload()}>
                ↻
              </button>
            </div>
            <div className="gmail-toolbar-right">
              <div className="gmail-pagination">
                <span>
                  {allFilteredMails.length > 0
                    ? `${startIndex + 1}-${Math.min(endIndex, allFilteredMails.length)} of ${allFilteredMails.length}`
                    : "No mails"
                  }
                  {selectedMails.size > 0 && ` (${selectedMails.size} selected)`}
                </span>
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage <= 1}
                  title="Previous page"
                >
                  ‹
                </button>
                <span className="gmail-page-info">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={currentPage >= totalPages}
                  title="Next page"
                >
                  ›
                </button>
              </div>
            </div>
          </div>

          {/* Mail list */}
          <div className="gmail-mail-list-container">
            {filteredMails.length === 0 ? (
              <div className="gmail-no-mails">
                <h3>No conversations in {labelName}</h3>
                <p>When you get new mail it will appear here.</p>
              </div>
            ) : (
              <div className="gmail-mail-list">
                {filteredMails.map((mail) => {
                  const draft = isDraftMailRobust(mail);
                  const isSelected = selectedMails.has(mail.id);
                  const isRead = readMails.has(mail.id);
                  const isStarred = isMailStarred(mail);
                  const mailLabels = getMailLabels(mail);

                  const senderInfo = (() => {
                    const sender = mail.sender || mail.otherParty;
                    if (!sender) return "(unknown)";
                    if (typeof sender === "string") return sender;
                    return sender.email || `${sender.firstName || ""} ${sender.lastName || ""}`.trim();
                  })();

                  return (
                    <div
                      key={mail.id}
                      className={`gmail-mail-item ${draft ? 'is-draft' : ''} ${isSelected ? 'selected' : ''} ${isRead ? 'read' : 'unread'} ${isStarred ? 'starred' : ''}`}
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--accent-weak, #fce8e6)'
                          : isRead
                            ? 'var(--surface, #f2f6fc)'
                            : '#ffffff',
                        fontWeight: isRead ? 'normal' : 'bold',
                        borderLeft: isSelected ? '3px solid var(--accent, #1a73e8)' : 'none'
                      }}
                    >
                      <div
                        className="gmail-mail-item-content"
                        onClick={(e) => handleMailItemClick(mail, e)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Checkbox */}
                        <div className="gmail-mail-checkbox">
                          <div
                            onClick={(e) => toggleMailSelection(mail.id, e)}
                            title={isSelected ? `Deselect mail from ${senderInfo}` : `Select mail from ${senderInfo}`}
                            style={{
                              width: '18px',
                              height: '18px',
                              border: '2px solid #dadce0',
                              borderRadius: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              backgroundColor: isSelected ? '#1a73e8' : 'transparent',
                              color: 'white',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {isSelected ? '✓' : ''}
                          </div>
                        </div>

                        {/* Star */}
                        <div
                          className="gmail-mail-star"
                          onClick={(e) => toggleStarred(mail.id, e)}
                          style={{
                            color: isStarred ? '#fbbc04' : '#5f6368',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                        >
                          {isStarred ? <FaStar /> : <FaRegStar />}
                        </div>

                        {/* Sender */}
                        <div className="gmail-mail-sender" style={{
                          fontWeight: isRead ? 'normal' : 'bold',
                          color: isRead ? '#5f6368' : '#202124'
                        }}>
                          {senderInfo}
                          {draft && <span style={{ color: 'var(--muted)', fontSize: '12px' }}> Draft</span>}
                        </div>

                        {/* Subject and preview */}
                        <div className="gmail-mail-subject-content">
                          <span className="gmail-mail-subject" style={{
                            fontWeight: isRead ? 'normal' : 'bold',
                            color: isRead ? '#5f6368' : '#202124'
                          }}>
                            {mail.subject || "(no subject)"}
                          </span>
                          <span className="gmail-mail-preview">
                            {mail.preview || mail.content?.slice(0, 100) || "(no content)"}
                          </span>
                        </div>

                        {/* Labels */}
                        <div className="gmail-mail-labels">
                          {mailLabels.map((label) => (
                            <span
                              key={label.id}
                              className={`gmail-label-chip ${label.name.toLowerCase()}`}
                            >
                              {label.name}
                            </span>
                          ))}
                        </div>

                        {/* Date */}
                        <div className="gmail-mail-date" style={{
                          fontWeight: isRead ? 'normal' : 'bold',
                          color: isRead ? '#5f6368' : '#202124'
                        }}>
                          {formatDate(mail.timestamp)}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="gmail-mail-actions">
                        {!["trash", "drafts"].includes((labelName || "").toLowerCase()) && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenLabelManagement((prev) => ({
                                  ...prev,
                                  [mail.id]: !prev[mail.id],
                                }));
                              }}
                              title="Labels"
                            >
                              <FaTag />
                            </button>

                            {openLabelManagement[mail.id] && (
                              <div className="gmail-label-management-popup">
                                {allLabels
                                  .filter((label) =>
                                    (label.name || "").toLowerCase() !== "trash" &&
                                    (label.name || "").toLowerCase() !== "starred" &&
                                    (label.name || "").toLowerCase() !== "drafts" &&
                                    (label.name || "").toLowerCase() !== "inbox"
                                  )
                                  .map((label) => {
                                    const isPendingSelection = (
                                      pendingLabelChanges[mail.id] || []
                                    ).includes(label.id);

                                    return (
                                      <div
                                        key={label.id}
                                        className="gmail-label-checkbox-item"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPendingLabelChanges((prev) => {
                                            const base = prev[mail.id] || currentMailLabels[mail.id] || [];
                                            const pending = new Set(base);
                                            if (!isPendingSelection) {
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
                                        style={{ cursor: 'pointer' }}
                                      >
                                        <input
                                          type="checkbox"
                                          onChange={() => { }}
                                          checked={isPendingSelection}
                                          readOnly
                                        />
                                        <span>{label.name}</span>
                                      </div>
                                    );
                                  })}

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveToLabels(mail.id);
                                  }}
                                  style={{
                                    marginTop: '8px',
                                    width: '100%',
                                    padding: '6px',
                                    background: 'var(--accent)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px'
                                  }}
                                >
                                  Apply
                                </button>
                              </div>
                            )}
                          </>
                        )}

                        {draft ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/draft/${mail.id}`, { state: { assumeDraft: true } });
                              }}
                              title="Edit Draft"
                            >
                              ✎
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("Discard this draft permanently?")) {
                                  discardDraft(mail.id);
                                }
                              }}
                              title="Discard Draft"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            {(labelName || "").toLowerCase() !== "trash" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveMailToTrashOnly(mail.id);
                                }}
                                title="Move to Trash"
                              >
                                <FaTrash />
                              </button>
                            )}

                            {(labelName || "").toLowerCase() === "trash" && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await fetch(`/api/mails/${mail.id}`, {
                                      method: "DELETE",
                                      headers: {
                                        Authorization: `Bearer ${token}`,
                                      },
                                    });
                                    setMails((prev) => prev.filter((m) => m.id !== mail.id));
                                  } catch (err) {
                                    console.error("Failed to delete mail:", err);
                                    alert("Failed to delete mail.");
                                  }
                                }}
                                title="Delete Forever"
                              >
                                ✕
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default LabelPage;