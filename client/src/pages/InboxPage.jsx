// src/pages/InboxPage.jsx
import React, { useEffect, useState } from "react";
import { fetchWithAuth, moveMailToLabel } from "../utils/api"; // Add in exercises 4 - for moving mails to labels
import Topbar from "../components/Topbar";
import { useNavigate, useSearchParams } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import LogoutButton from "../components/LogoutButton";

function InboxPage() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [mails, setMails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allLabels, setAllLabels] = useState([]);// Add in exercises 4 - for moving mails to labels
  //const [showComponent, setShowComponent] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");// Add in exercises 4 - for moving mails to labels
  const [searchParams, setSearchParams] = useSearchParams();

  /*useEffect(() => {
      const fetchMails = async () => {
        try {
          const response = await fetch("/api/mails", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          if (!response.ok) {
            throw new Error("Failed to fetch mails");
          }
          
          
          const data = await response.json();
          setMails(Array.isArray(data.recent_mails) ? data.recent_mails : []);
          console.log("Mail object example:", data.recent_mails[0]);
        } catch (err) {
          console.error("Error fetching mails:", err);
        } finally {
          setLoading(false);
        }
      };*/

  // Helper: fetch mails (all or by query)
  const fetchMails = async (query = null) => {
    setLoading(true);
    try {
      const url = query
        ? `/api/mails/search?q=${encodeURIComponent(query)}`
        : "/api/mails";

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch mails");

      const data = await response.json();
      if (Array.isArray(data.recent_mails)) {
        setMails(data.recent_mails);
      } else if (Array.isArray(data)) {
        setMails(data);
      } else {
        setMails([]);
      }

      // New part: fetch labels as well
      const token = localStorage.getItem("token");
      fetchWithAuth("/labels", token)
        .then(setAllLabels)
        .catch(console.error);

    } catch (err) {
      console.error("Fetch error:", err);
      setMails([]);
    } finally {
      setLoading(false);
    }
  };

  // Add in exercises 4 - move mail to label
  const handleMove = async (mailId, toLabelId) => {
    try {
      await moveMailToLabel(mailId, "inbox", toLabelId, token); // from inbox
      setMails((prev) => prev.filter((m) => m.id !== mailId)); // remove mail from view
    } catch (err) {
      console.error("Failed to move mail:", err);
      alert("Failed to move mail.");
    }
  };

  // On first load
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      const query = searchParams.get("q");
      fetchMails(query);
    }
  }, []);

  // When user triggers search
  const handleSearch = async (query) => {
    const trimmed = query.trim();
    if (!trimmed) {
      alert("Empty search query – skipping request.");
      return;
    }

    // Optional: validate query
    // const isValid = /^[\p{L}\p{N}\s@.?!'"-]+$/u.test(trimmed);
    // if (!isValid) {
    //   alert("Search query contains invalid characters.");
    //   return;
    // }

    if (searchParams.get("q") !== trimmed) {
      setSearchParams({ q: trimmed });
    }

    await fetchMails(trimmed);
  };

  return (
    <>
      <Topbar onSearch={handleSearch} />

      <div style={{ padding: "1rem" }}>
        <SearchBar onSearch={handleSearch} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>Inbox</h1>
          <LogoutButton />
        </div>
        

        {loading ? (
          <p>Loading...</p>

        ) : mails.length === 0 ? (
          <p>No mails found.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {mails.map((mail) => (
              <li
                key={mail.id}
                onClick={() => navigate(`/mail/${mail.id}`)}
                style={{
                  cursor: "pointer",
                  border: "1px solid #ccc",
                  padding: "1rem",
                  marginBottom: "1rem",
                  borderRadius: "8px",
                  backgroundColor: "#f9f9f9",
                }}
              >
                <strong>{mail.direction === "sent" ? "To" : "From"}:</strong>{" "}
                {mail.direction === "sent"
                  ? (Array.isArray(mail.recipients)
                    ? mail.recipients.join(", ")
                    : mail.recipient || "(unknown)")
                  : mail.sender || "(unknown)"}

                <br />
                <strong>Subject:</strong>{" "}
                {mail.subject || <em>(no subject)</em>} <br />
                <strong>Date:</strong>{" "}
                {new Date(mail.timestamp).toLocaleString()} <br />
                <p style={{ color: "#666" }}>
                  {mail.preview || mail.content?.slice(0, 100) || (
                    <em>(no content)</em>
                  )}
                </p>
                {/* dropdown to move mail to another label */}
                <label>Move to:</label>{" "}
                <select
                  defaultValue=""
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleMove(mail.id, e.target.value);
                    }
                  }}
                >
                  <option value="" disabled>Select label</option>
                  {allLabels.map((label) => (
                    <option key={label.id} value={label.id}>
                      {label.name}
                    </option>
                  ))}
                </select>

                {Array.isArray(mail.labels) && mail.labels.length > 0 && (
                  <div className="mail-labels">
                    {mail.labels.map((label) => (
                      <span
                        key={label}
                        className="mail-label"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default InboxPage;
