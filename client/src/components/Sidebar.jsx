import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useSendMail } from "../context/SendMailContext";
import "./Sidebar.css";

const SYSTEM_LABELS = ["inbox", "sent", "trash", "drafts", "spam"];
const isSystemLabel = (name = "") =>
  SYSTEM_LABELS.includes(String(name).toLowerCase());

const Sidebar = () => {
  const [labels, setLabels] = useState([]);
  const [newLabel, setNewLabel] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
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

  const handleCreateLabel = async () => {
    const name = newLabel.trim();
    if (!name) return;
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
          if (errorData?.error) {
            errorMsg = errorData.error;
          }
        } catch {
          // If there's no JSON body, it's okay – we'll keep the generic message
        }
        throw new Error(errorMsg);
    }
      const created = await res.json();
      setLabels((prev) => [...prev, created]);
      setNewLabel("");
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
      <h2>FooMail</h2>

      <div className="new-mail">
        <button className="compose-btn" onClick={() => setShow(true)}>
          Compose
        </button>
      </div>

      <ul>
        {/* system labels*/}
        <li>
          <NavLink to="/label/inbox">Inbox</NavLink>
        </li>
        <li>
          <NavLink to="/label/sent">Sent</NavLink>
        </li>
        <li>
          <NavLink to="/label/spam">Spam</NavLink>
        </li>
        <li>
            <NavLink to="/label/drafts">Drafts</NavLink>
        </li>
        <li>
          <NavLink to="/label/trash">Trash</NavLink>
        </li>

        {/* User labels */}
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
                <i className="bi bi-three-dots-vertical"></i>
              </button>

              <div
                className={`label-menu ${
                  openMenuId === label.id ? "open" : ""
                }`}
              >
                <button onClick={() => handleRenameLabel(label)}>Rename</button>
                <button onClick={() => handleDeleteLabel(label.id)}>Remove</button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="new-label-form">
        <input
          type="text"
          placeholder="New label name"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // prevent form submission
              handleCreateLabel();
            }
          }}
        />
        <button onClick={handleCreateLabel}>Create Label</button>
      </div>
    </nav>
  );
};

export default Sidebar;
