import { useState } from "react";
import "../styles/SendMailComponent.css";

export default function SendMailComponent({
  onClose,
  initialRecipient = "",
  initialSubject = "",
  initialContent = "",
}) {
  const [recipient, setRecipient] = useState(initialRecipient);
  const [subject, setSubject] = useState(initialSubject);
  const [content, setContent] = useState(initialContent);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [ccRecipients, setCcRecipients] = useState("");
  const [bccRecipients, setBccRecipients] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Helper function to count unique recipients
  const getUniqueRecipientsCount = () => {
    const allEmails = new Set();
    
    // Add TO recipients
    if (recipient.trim()) {
      recipient.split(",")
        .map(e => e.trim())
        .filter(Boolean)
        .forEach(email => allEmails.add(email.toLowerCase()));
    }
    
    // Add CC recipients  
    if (ccRecipients.trim()) {
      ccRecipients.split(",")
        .map(e => e.trim())
        .filter(Boolean)
        .forEach(email => allEmails.add(email.toLowerCase()));
    }
    
    // Add BCC recipients
    if (bccRecipients.trim()) {
      bccRecipients.split(",")
        .map(e => e.trim())
        .filter(Boolean)
        .forEach(email => allEmails.add(email.toLowerCase()));
    }
    
    return allEmails.size;
  };

  const handleSaveDraft = async () => {
    try {
      const token = localStorage.getItem("token");
      const sender = localStorage.getItem("email");
      // get or create the drafts label
      const labelsResponse = await fetch("/api/labels", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allLabels = await labelsResponse.json();
      
      let draftsLabel = allLabels.find(l => (l.name || "").toLowerCase() === "drafts");

      // if drafts label doesn't exist, create it
      if (!draftsLabel) {
        const createResponse = await fetch("/api/labels", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: "Drafts" })
        });
        if (!createResponse.ok) {
          const err = await createResponse.json().catch(() => ({}));
          throw new Error(err.error || "Failed to create Drafts label");
        }
        draftsLabel = await createResponse.json();
      }

    const labelsToSend = draftsLabel ? [draftsLabel.id] : [];
      
      const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);
      
      // Validate TO recipients if provided
      let recipientsArray = [];
      if (recipient.trim()) {
        recipientsArray = recipient
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);
          
        const invalidEmails = recipientsArray.filter(email => !isValidEmail(email));
        if (invalidEmails.length > 0) {
          alert(`Invalid email addresses in TO field: ${invalidEmails.join(", ")}`);
          return;
        }
      }

      // Validate CC recipients if provided
      if (ccRecipients.trim()) {
        const ccArray = ccRecipients
          .split(",")
          .map((email) => email.trim())
          .filter((email) => email.length > 0);

        const invalidCcEmails = ccArray.filter(email => !isValidEmail(email));
        if (invalidCcEmails.length > 0) {
          alert(`Invalid email addresses in CC field: ${invalidCcEmails.join(", ")}`);
          return;
        }
      }

      // Validate BCC recipients if provided
      if (bccRecipients.trim()) {
        const bccArray = bccRecipients
          .split(",")
          .map((email) => email.trim())
          .filter((email) => email.length > 0);

        const invalidBccEmails = bccArray.filter(email => !isValidEmail(email));
        if (invalidBccEmails.length > 0) {
          alert(`Invalid email addresses in BCC field: ${invalidBccEmails.join(", ")}`);
          return;
        }
      }

      // Collect all unique recipients for draft saving
      const allRecipientsSet = new Set();
      
      // Add TO recipients if any
      if (recipientsArray.length > 0) {
        recipientsArray.forEach(email => allRecipientsSet.add(email.toLowerCase()));
      }

      // Add CC recipients if any  
      if (ccRecipients.trim()) {
        const ccArray = ccRecipients
          .split(",")
          .map((email) => email.trim())
          .filter((email) => email.length > 0);
        ccArray.forEach(email => allRecipientsSet.add(email.toLowerCase()));
      }

      // Add BCC recipients if any
      if (bccRecipients.trim()) {
        const bccArray = bccRecipients
          .split(",")
          .map((email) => email.trim())
          .filter((email) => email.length > 0);
        bccArray.forEach(email => allRecipientsSet.add(email.toLowerCase()));
      }

      // Convert back to array
      const uniqueRecipients = Array.from(allRecipientsSet);

      const res = await fetch("/api/mails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sender,
          recipients: uniqueRecipients,
          subject,
          content,
          isDraft: true,
          labels: labelsToSend,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save draft");
      }

      alert("Draft saved.");
      onClose?.();
    } catch (e) {
      alert(e.message);
      console.error(e);
    }
  };

  const handleSend = async () => {
    const token = localStorage.getItem("token");
    const sender = localStorage.getItem("email");

    if (!recipient) {
      alert("Recipient is required.");
      return;
    }

    // Validate main recipients
    const recipientsArray = recipient
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

    // Check TO field
    const invalidToEmails = recipientsArray.filter(email => !isValidEmail(email));
    if (invalidToEmails.length > 0) {
      alert(`Invalid email addresses in TO field: ${invalidToEmails.join(", ")}`);
      return;
    }

    // Validate CC recipients if provided
    if (ccRecipients.trim()) {
      const ccArray = ccRecipients
        .split(",")
        .map((email) => email.trim())
        .filter((email) => email.length > 0);

      const invalidCcEmails = ccArray.filter(email => !isValidEmail(email));
      if (invalidCcEmails.length > 0) {
        alert(`Invalid email addresses in CC field: ${invalidCcEmails.join(", ")}`);
        return;
      }
    }

    // Validate BCC recipients if provided
    if (bccRecipients.trim()) {
      const bccArray = bccRecipients
        .split(",")
        .map((email) => email.trim())
        .filter((email) => email.length > 0);

      const invalidBccEmails = bccArray.filter(email => !isValidEmail(email));
      if (invalidBccEmails.length > 0) {
        alert(`Invalid email addresses in BCC field: ${invalidBccEmails.join(", ")}`);
        return;
      }
    }

    if (!subject || !content) {
      const confirmSend = window.confirm(
        "Your email is missing a " +
          (!subject && !content
            ? "subject and content"
            : !subject
            ? "subject"
            : "content") +
          ". Do you want to send it anyway?"
      );
      if (!confirmSend) return;
    }

    try {
      // Collect all recipients and remove duplicates
      const allRecipientsSet = new Set();
      
      // Add TO recipients
      recipientsArray.forEach(email => allRecipientsSet.add(email.toLowerCase()));
      
      // Add CC recipients if any
      if (ccRecipients.trim()) {
        const ccArray = ccRecipients
          .split(",")
          .map((email) => email.trim())
          .filter((email) => email.length > 0);
        ccArray.forEach(email => allRecipientsSet.add(email.toLowerCase()));
      }
      
      // Add BCC recipients if any
      if (bccRecipients.trim()) {
        const bccArray = bccRecipients
          .split(",")
          .map((email) => email.trim())
          .filter((email) => email.length > 0);
        bccArray.forEach(email => allRecipientsSet.add(email.toLowerCase()));
      }

      // Convert back to array with original case
      const uniqueRecipients = Array.from(allRecipientsSet);
      
      // Show info if duplicates were removed
      const totalOriginalCount = recipientsArray.length + 
        (ccRecipients.trim() ? ccRecipients.split(",").filter(e => e.trim()).length : 0) +
        (bccRecipients.trim() ? bccRecipients.split(",").filter(e => e.trim()).length : 0);
        
      if (uniqueRecipients.length < totalOriginalCount) {
        const duplicatesCount = totalOriginalCount - uniqueRecipients.length;
        console.log(`Removed ${duplicatesCount} duplicate email address(es)`);
      }

       const res = await fetch("/api/mails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipients: recipientsArray,
        subject,
        content,
        sender,
        isDraft: false
      })
    });

      if (res.ok) {
        // Show success message with duplicate info if relevant
        if (uniqueRecipients.length < totalOriginalCount) {
          const duplicatesCount = totalOriginalCount - uniqueRecipients.length;
          alert(`Mail sent to ${uniqueRecipients.length} recipients! (${duplicatesCount} duplicate address(es) were automatically removed)`);
        } else {
          alert("Mail sent!");
        }
        onClose();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to send mail.");
      }
    } catch (error) {
      console.error("Send error:", error);
      alert("Failed to send mail due to network error.");
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    // Ctrl/Cmd + Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
    
    // Escape to close (only if not focused on textarea)
    if (e.key === 'Escape' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();

      onClose();
    }
  };

  return (
    <>
      {/* Modal Overlay */}
      <div 
        className="gmail-compose-overlay"
        onClick={onClose}
      />
      
      {/* Gmail Compose Window */}
      <div 
        className={`gmail-compose-window ${isMinimized ? 'minimized' : ''} ${isFullscreen ? 'fullscreen' : ''}`}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="gmail-compose-header">
          <h3 className="gmail-compose-title">New message</h3>
          <div className="gmail-compose-actions">
            <button 
              className="gmail-compose-action" 
              aria-label="Minimize"
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              −
            </button>
            <button 
              className="gmail-compose-action" 
              aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? '🗗' : '☐'}
            </button>
            <button 
              className="gmail-compose-action" 
              aria-label="Close"
              type="button"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>

        {/* Body - Hidden when minimized */}
        {!isMinimized && (
          <div className="gmail-compose-body">
            {/* Recipients */}
            <div className="gmail-compose-recipients">
              <div className="gmail-compose-field">
                <label className="gmail-compose-label" htmlFor="to-field">To</label>
                <input
                  id="to-field"
                  className="gmail-compose-input"
                  type="text"
                  placeholder="Recipients"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  autoComplete="email"
                />
                <div className="gmail-compose-cc-bcc">
                  <button
                    type="button"
                    className="gmail-compose-cc-link"
                    onClick={() => setShowCc(!showCc)}
                    aria-expanded={showCc}
                  >
                    Cc
                  </button>
                  <button
                    type="button"
                    className="gmail-compose-cc-link"
                    onClick={() => setShowBcc(!showBcc)}
                    aria-expanded={showBcc}
                  >
                    Bcc
                  </button>
                </div>
              </div>

              {/* CC Field */}
              {showCc && (
                <div className="gmail-compose-field">
                  <label className="gmail-compose-label" htmlFor="cc-field">Cc</label>
                  <input
                    id="cc-field"
                    className="gmail-compose-input"
                    type="text"
                    placeholder="Carbon copy recipients"
                    value={ccRecipients}
                    onChange={(e) => setCcRecipients(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              )}

              {/* BCC Field */}
              {showBcc && (
                <div className="gmail-compose-field">
                  <label className="gmail-compose-label" htmlFor="bcc-field">Bcc</label>
                  <input
                    id="bcc-field"
                    className="gmail-compose-input"
                    type="text"
                    placeholder="Blind carbon copy recipients"
                    value={bccRecipients}
                    onChange={(e) => setBccRecipients(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              )}
            </div>

            {/* Subject */}
            <div className="gmail-compose-subject">
              <div className="gmail-compose-field">
                <label className="gmail-compose-label" htmlFor="subject-field">Subject</label>
                <input
                  id="subject-field"
                  className="gmail-compose-input"
                  type="text"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            </div>

            {/* Message Body */}
            <div className="gmail-compose-message">
              <div className="gmail-compose-editor">
                <textarea
                  className="gmail-compose-textarea"
                  placeholder="Compose your message..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  spellCheck="true"
                  aria-label="Message content"
                />
              </div>
            </div>

            {/* Toolbar - Only Send and Save Draft buttons */}
            <div className="gmail-compose-toolbar">
              <div className="gmail-compose-toolbar-left">
                <button 
                  className="gmail-send-button"
                  onClick={handleSend}
                  type="button"
                  disabled={!recipient.trim()}
                  aria-label="Send"
                  title={getUniqueRecipientsCount() > 0 ? `Send to ${getUniqueRecipientsCount()} recipient(s)` : "Send"}
                >
                  <span>Send</span>
                  {getUniqueRecipientsCount() > 1 && (
                    <span className="recipient-count">({getUniqueRecipientsCount()})</span>
                  )}
                </button>
                <button 
                  className="gmail-save-draft-button" 
                  aria-label="Save draft"
                  type="button"
                  onClick={handleSaveDraft}
                >
                  <span>Save Draft</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}