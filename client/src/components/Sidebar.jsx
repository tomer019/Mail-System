import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useSendMail } from "../context/SendMailContext";

const SYSTEM_LABELS = ["inbox", "sent", "trash", "drafts", "spam", "starred"]; // Add starred to system labels
const isSystemLabel = (name = "") =>
  SYSTEM_LABELS.includes(String(name).toLowerCase());

const Sidebar = () => {
  const [labels, setLabels] = useState([]);
  const [newLabel, setNewLabel] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false); // UI only: toggle form
  const { setShow } = useSendMail();

  // load labels
  useEffect(() => {
    const token = localStorage.getItem("token");
    (async () => {
      try {
        const res = await fetch("/api/labels", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setLabels(Array.isArray(data) ? data : []);

        // Ensure starred label exists
        const existingStarred = data.find(l => l.name.toLowerCase() === "starred");
        if (!existingStarred) {
          // Create starred label if it doesn't exist
          const starredRes = await fetch("/api/labels", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ name: "Starred" }),
          });
          if (starredRes.ok) {
            const created = await starredRes.json();
            setLabels(prev => [...prev, created]);
          }
        }
      } catch (e) {
        console.error("Failed to fetch labels:", e);
      }
    })();
  }, []);

  // close on click outside menu
  useEffect(() => {
    if (!openMenuId) return;
    const onDocClick = (e) => {
      if (!e.target.closest?.(`[data-menu-for="${openMenuId}"]`)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [openMenuId]);

  const toggleMenu = (id) => {
    setOpenMenuId((prev) => (prev === id ? null : id));
  };

  // unchanged logic for creating a label (validation is mostly in server)
  const handleCreateLabel = async () => {
    const name = newLabel.trim();
    if (!name) return;

    // Check for reserved system label names (case-insensitive)
    const systemLabels = ["inbox", "sent", "spam", "drafts", "starred", "trash"];
    if (systemLabels.includes(name.toLowerCase())) {
      alert("Cannot create label with a reserved system name. Please choose a different name.");
      return;
    }

    try {
      const res = await fetch("/api/labels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        let errorMsg = `Failed to create label (${res.status})`;
        try {
          const errorData = await res.json();
          if (errorData?.error) errorMsg = errorData.error;
        } catch { }
        throw new Error(errorMsg);
      }
      const created = await res.json();
      setLabels((prev) => [...prev, created]);
      setNewLabel("");
      setShowAddForm(false); // close after creation (UI Only)
    } catch (e) {
      console.error("Create label error:", e);
      alert(e.message || "An unexpected error occurred while creating the label.");
    }
  };

  const handleDeleteLabel = async (labelId) => {
    try {
      const res = await fetch(`/api/labels/${labelId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        setLabels((prev) => prev.filter((l) => l.id !== labelId));
      } else {
        console.error("Failed to delete label");
      }
    } catch (e) {
      console.error("Delete label error:", e);
    } finally {
      setOpenMenuId(null);
    }
  };

  const handleRenameLabel = async (label) => {
    const next = (window.prompt("New label name:", label.name) || "").trim();
    if (!next || next === label.name) return;

    // Check for reserved system label names (case-insensitive)
    const systemLabels = ["inbox", "sent", "spam", "drafts", "starred", "trash"];
    if (systemLabels.includes(next.toLowerCase())) {
      alert("Cannot rename label to a reserved system name. Please choose a different name.");
      return;
    }

    const duplicate = labels.some(
      (l) => l.id !== label.id && l.name.toLowerCase() === next.toLowerCase()
    );
    if (duplicate) {
      alert("A label with this name already exists.");
      return;
    }

    try {
      const res = await fetch(`/api/labels/${label.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name: next }),
      });
      if (!res.ok) {
        console.error("Failed to rename label");
        return;
      }
      setLabels((prev) =>
        prev.map((l) => (l.id === label.id ? { ...l, name: next } : l))
      );
    } catch (e) {
      console.error("Rename label error:", e);
    } finally {
      setOpenMenuId(null);
    }
  };

  const userLabels = labels.filter((l) => !isSystemLabel(l.name));

  return (
    <nav className="sidebar">
      {/* Compose mail (not a logical change) */}
      <div className="sidebar-header">
        <button className="compose-btn" onClick={() => setShow(true)}>
          Compose
        </button>
      </div>

      <div className="sidebar-content">
        {/* Main navigation */}
        <div className="sidebar-section">
          <ul>
            <li><NavLink to="/label/inbox">Inbox</NavLink></li>
            <li><NavLink to="/label/starred">Starred</NavLink></li> {/* Add starred link */}
            <li><NavLink to="/label/sent">Sent</NavLink></li>
            <li><NavLink to="/label/drafts">Drafts</NavLink></li>
            <li><NavLink to="/label/spam">Spam</NavLink></li>
            <li><NavLink to="/label/trash">Trash</NavLink></li>
          </ul>
        </div>

        {/* User labels */}
        <div className="sidebar-section">
          <div className="labels-header">
            <h3>Labels</h3>
            <button
              className="labels-add-btn"
              aria-label="Create new label"
              title="Create new label"
              onClick={() => setShowAddForm((v) => !v)}
            >
              +
            </button>
          </div>

          {userLabels.length > 0 && (
            <ul>
              {userLabels.map((label) => (
                <li key={label.id}>
                  <div className="label-row" data-menu-for={label.id}>
                    <NavLink to={`/label/${label.id}`}>{label.name}</NavLink>

                    <button
                      className="menu-toggle"
                      onClick={() => toggleMenu(label.id)}
                      aria-label={`Actions for ${label.name}`}
                      title="Actions"
                    >
                      ⋮
                    </button>

                    <div
                      className={`label-menu ${openMenuId === label.id ? "open" : ""
                        }`}
                    >
                      <button onClick={() => handleRenameLabel(label)}>Rename</button>
                      <button onClick={() => handleDeleteLabel(label.id)}>Remove</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {showAddForm && (
            <div className="new-label-form">
              <input
                type="text"
                placeholder="Create new label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateLabel();
                  }
                }}
                autoFocus
              />
              <button onClick={handleCreateLabel}>Create Label</button>
            </div>
          )}
        </div>
      </div>

    </nav>
  );
};

export default Sidebar;