// MailViewPage.jsx - Gmail-style mail view with enhanced UI

import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import SendMailComponent from "../components/SendMailComponent";
import Loading from "../components/Loading";
import { FaStar, FaRegStar, FaReply, FaReplyAll, FaShare, FaArrowLeft } from "react-icons/fa";
import "../styles/MailViewPage.css";

function MailViewPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [mail, setMail] = useState(null);
  const [error, setError] = useState(null);
  const [showReply, setShowReply] = useState(false);
  const [showForward, setShowForward] = useState(false);
  const [showReplyAll, setShowReplyAll] = useState(false);
  const [labels, setLabels] = useState([]);
  const [currentMailLabels, setCurrentMailLabels] = useState([]);
  const [starredLabelId, setStarredLabelId] = useState(null);
  const [allLabels, setAllLabels] = useState([]);

  // Handle back navigation
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/label/inbox');
    }
  };

  // Check if mail is starred
  const isMailStarred = () => {
    if (!starredLabelId || !currentMailLabels) return false;
    return currentMailLabels.includes(starredLabelId);
  };

  // Toggle starred status
  const toggleStarred = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!starredLabelId || !id) {
      console.warn('Cannot toggle starred: missing starredLabelId or mailId');
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const isCurrentlyStarred = isMailStarred();

      if (isCurrentlyStarred) {
        // Remove starred label
        const response = await fetch("/api/labels/untag", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ mailId: id, labelId: starredLabelId }),
        });

        if (response.ok) {
          setCurrentMailLabels(prev => prev.filter(labelId => labelId !== starredLabelId));
        }
      } else {
        // Add starred label
        const response = await fetch("/api/labels/tag", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ mailId: id, labelId: starredLabelId }),
        });

        if (response.ok) {
          setCurrentMailLabels(prev => [...prev, starredLabelId]);
        }
      }
    } catch (error) {
      console.error('Error toggling starred status:', error);
    }
  };

  // Enhanced function to mark mail as read with event dispatch
  const markMailAsRead = (mailId) => {
    try {
      const stored = localStorage.getItem('readMails');
      let readMails = stored ? JSON.parse(stored) : [];
      
      if (!readMails.includes(mailId)) {
        readMails.push(mailId);
        localStorage.setItem('readMails', JSON.stringify(readMails));
        
        // Dispatch event to notify other components about the change
        window.dispatchEvent(new CustomEvent('readMailsUpdated'));
        
        console.log(`✅ Marked mail ${mailId} as read`, readMails);
      } else {
        console.log(`📧 Mail ${mailId} was already marked as read`);
      }
    } catch (error) {
      console.error("⚠ Error updating read status:", error);
    }
  };

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { 
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString([], { 
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  useEffect(() => {
    const fetchMail = async () => {
      try {
        console.log(`🔍 Fetching mail ${id}...`);
        const token = localStorage.getItem("token");
        
        // Fetch mail data
        const response = await fetch(`/api/mails/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error("Failed to fetch mail");
        const data = await response.json();
        
        console.log("📬 Mail received:", data);
        setMail(data);
        setLabels(data.labels || []);
        
        // Fetch all labels to get starred label ID
        const labelsResponse = await fetch("/api/labels", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (labelsResponse.ok) {
          const allLabelsData = await labelsResponse.json();
          setAllLabels(allLabelsData);
          
          // Find starred label ID
          const starredLabel = allLabelsData.find(l => l.name.toLowerCase() === "starred");
          if (starredLabel) {
            setStarredLabelId(starredLabel.id);
          }
        }
        
        // Fetch current mail labels
        const mailLabelsResponse = await fetch(`/api/labels/mail/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (mailLabelsResponse.ok) {
          const mailLabels = await mailLabelsResponse.json();
          setCurrentMailLabels(Array.isArray(mailLabels) ? mailLabels : []);
        }
        
        // Mark this mail as read when it's opened
        markMailAsRead(id);
        
      } catch (err) {
        console.error("⚠ Error fetching mail:", err);
        setError("Could not load mail");
      }
    };

    fetchMail();
  }, [id, location]);

  if (error) {
    return (
      <div className="mail-view-container">
        <div className="mail-not-found">
          <h2>Mail Not Found</h2>
          <p style={{ color: 'red' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!mail) {
    return <Loading label="Loading mail…" />;
  }

  const myEmail = (localStorage.getItem("email") || "").trim().toLowerCase();
const iAmSender = (mail.sender?.email || "").trim().toLowerCase() === myEmail;

const recipientsArray = Array.isArray(mail.recipients)
  ? mail.recipients
  : mail.recipient
  ? [mail.recipient]
  : [];

// de-duplication by email
const uniqueRecipients = [
  ...new Map(
    recipientsArray
      .filter(r => r && r.email)
      .map(r => [r.email.trim().toLowerCase(), r])
  ).values(),
];

// Processing name for display (me if it's me, otherwise first+last or email)
const nameOf = (r) => {
  const isMe = (r.email || "").trim().toLowerCase() === myEmail;
  if (isMe) return "me";
  const full = [r.firstName, r.lastName].filter(Boolean).join(" ").trim();
  return full || r.email;
};

// Order: if I'm not the sender – "me" first then the rest; if I am the sender – by the order sent
const orderedRecipients = iAmSender
  ? uniqueRecipients
  : [
      ...uniqueRecipients.filter(r => (r.email || "").trim().toLowerCase() === myEmail),
      ...uniqueRecipients.filter(r => (r.email || "").trim().toLowerCase() !== myEmail),
    ];

  return (
    <div className="mail-view-container">
      <div className="mail-card">
        {/* Back Button */}
        <div className="mail-back-button-container">
          <button 
            className="mail-back-button"
            onClick={handleBack}
            aria-label="Back"
            title="Back to previous page"
          >
            <FaArrowLeft />
            Back
          </button>
        </div>

        {/* Subject Header with Star */}
        <div className="mail-subject-header">
          <h1 className="mail-subject-title">
            {mail.subject === null || mail.subject === undefined ? (
              <em>(no subject)</em>
            ) : (
              mail.subject
            )}
          </h1>
          <div className="mail-subject-actions">
            <div 
              onClick={toggleStarred}
              style={{ 
                color: isMailStarred() ? '#fbbc04' : '#5f6368',
                cursor: 'pointer',
                userSelect: 'none'
              }}
              title={isMailStarred() ? "Remove star" : "Add star"}
              className="mail-star-icon"
            >
              {isMailStarred() ? <FaStar /> : <FaRegStar />}
            </div>
          </div>
        </div>

        {/* Labels */}
        {labels.length > 0 && (
          <div className="mail-labels-container">
            {labels.map((label) => (
              <span key={label.id || label} className="mail-label-chip">
                {typeof label === 'object' ? label.name : label}
              </span>
            ))}
          </div>
        )}

        {/* Meta Information Line */}
        <div className="mail-meta-line">
          <img
            src={
              mail.sender?.profileImage?.startsWith("data:image")
                ? mail.sender.profileImage
                : mail.sender?.profileImage || "/user-svgrepo-com.svg"
            }
            alt="Sender avatar"
            className="mail-avatar"
          />
          
          <div className="mail-sender-info">
            <div className="mail-from-line">
              <span className="mail-sender-name">
                {mail.sender?.firstName} {mail.sender?.lastName}
              </span>
              <span className="mail-sender-email">
                &lt;{mail.sender?.email}&gt;
              </span>
            </div>
            <div className="mail-to-line">
              to{" "}
              {orderedRecipients.length
                ? orderedRecipients.map((r, idx) => (
                    <span key={r.email || idx}>
                      {nameOf(r)}{idx < orderedRecipients.length - 1 ? ", " : ""}
                    </span>
                  ))
                : <span>no recipient</span>}
            </div>
          </div>
          
          <div className="mail-date-time">
            {formatDate(mail.timestamp)}
          </div>
        </div>

        {/* Mail Body */}
        <div className="mail-body-content">
          {mail.content === null || mail.content === undefined ? (
            <em>(no content)</em>
          ) : (
            mail.content
          )}
        </div>

        {/* Action Buttons */}
        <div className="mail-action-buttons">
          <button 
            className="mail-action-btn" 
            onClick={() => setShowReply(true)}
            aria-label="Reply to sender"
          >
            <FaReply />
            Reply
          </button>
          <button 
            className="mail-action-btn" 
            onClick={() => setShowReplyAll(true)}
            aria-label="Reply to all recipients"
          >
            <FaReplyAll />
            Reply all
          </button>
          <button 
            className="mail-action-btn" 
            onClick={() => setShowForward(true)}
            aria-label="Forward message"
          >
            <FaShare />
            Forward
          </button>
        </div>
      </div>

      {/* Reply Modal */}
      {showReply && (
        <>
          <div
            className="mail-modal-overlay"
            onClick={() => setShowReply(false)}
          />
          <SendMailComponent
            onClose={() => setShowReply(false)}
            initialRecipient={mail.sender?.email}
            initialSubject={
              mail.subject?.startsWith("Re:") ? mail.subject : `Re: ${mail.subject}`
            }
            initialContent={`\n\n--- Original Message ---\n${mail.content}`}
          />
        </>
      )}

      {/* Reply All Modal */}
      {showReplyAll && (
        <>
          <div
            className="mail-modal-overlay"
            onClick={() => setShowReplyAll(false)}
          />
          <SendMailComponent
            onClose={() => setShowReplyAll(false)}
            initialRecipient={[
              mail.sender?.email,
              ...(Array.isArray(mail.recipients) ? mail.recipients : [])
                .filter((r) => r.email && r.email !== localStorage.getItem("email"))
                .map((r) => r.email),
            ]
              .filter((email) => email && email !== localStorage.getItem("email"))
              .join(", ")}
            initialSubject={
              mail.subject?.startsWith("Re:") ? mail.subject : `Re: ${mail.subject}`
            }
            initialContent={`\n\n--- Original Message ---\n${mail.content}`}
          />
        </>
      )}

      {/* Forward Modal */}
      {showForward && (
        <>
          <div
            className="mail-modal-overlay"
            onClick={() => setShowForward(false)}
          />
          <SendMailComponent
            onClose={() => setShowForward(false)}
            initialRecipient=""
            initialSubject={
              mail.subject?.startsWith("Fwd:") ? mail.subject : `Fwd: ${mail.subject}`
            }
            initialContent={`\n\n--- Forwarded Message ---\nFrom: ${mail.sender?.email}\nTo: ${
              Array.isArray(mail.recipients) 
                ? mail.recipients.map(r => r.email).join(", ")
                : mail.recipient?.email
            }\nDate: ${new Date(mail.timestamp).toLocaleString()}\n\n${mail.content}`}
          />
        </>
      )}
    </div>
  );
}

export default MailViewPage;