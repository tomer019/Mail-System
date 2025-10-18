import { useState } from "react";

export default function SendMailComponent({ onClose, initialRecipient = "", initialSubject = "", initialContent = "" }) {

  const [recipient, setRecipient] = useState(initialRecipient);
  const [subject, setSubject] = useState(initialSubject);
  const [content, setContent] = useState(initialContent);

  const handleSaveDraft = async () => {
    try {
      const token = localStorage.getItem("token");
      const sender = localStorage.getItem("email");
      const recipientsArray = recipient
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      const res = await fetch("/api/mails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sender,
          recipients: recipientsArray,
          subject,
          content,
          isDraft: true,       
          labels: ["drafts"],   
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
    const sender = localStorage.getItem("email"); // Assuming email is stored in localStorage

    if (!recipient) {
      alert("Recipient is required.");
      return;
    }

    const recipientsArray = recipient
      .split(",")
      .map(email => email.trim())
      .filter(email => email.length > 0);

    const isValidEmail = email => /\S+@\S+\.\S+/.test(email);

    if (!recipientsArray.every(isValidEmail)) {
      alert("One or more recipient emails are invalid.");
      return;
    }

    if (!subject || !content) {
      const confirmSend = window.confirm(
        "Your email is missing a " +
        (!subject && !content ? "subject and content" :
          !subject ? "subject" :
            "content") +
        ". Do you want to send it anyway?"
      );
      if (!confirmSend) return;
    }

    const res = await fetch("http://localhost:3000/api/mails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        recipients: recipientsArray,
        subject,
        content,
        sender
      })
    });

    if (res.ok) {
      alert("Mail sent!");
      onClose();
    } else {
      const errorData = await res.json();
      alert(errorData.error || "Failed to send mail.");
    }
  };

  return (
    <div style={{
      position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)",
      backgroundColor: "white", padding: "1rem", border: "1px solid gray", zIndex: 1000
    }}>
      <h3>Send Mail</h3>
      <input placeholder="To" value={recipient} onChange={e => setRecipient(e.target.value)} /><br />
      <input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} /><br />
      <textarea placeholder="Message" value={content} onChange={e => setContent(e.target.value)} /><br />
      <button onClick={handleSend}>Send</button>
      <button onClick={onClose}>Cancel</button>
      <button type="button" onClick={handleSaveDraft}>שמור כטיוטה</button>

    </div >
  );

}

