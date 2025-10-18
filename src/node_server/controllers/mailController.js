const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { extractUrls } = require("../utils/extractUrls");
const { checkUrlBlacklist } = require("../utils/blacklistClient");
const inboxMap = require('../utils/inboxMap');
const { getAllLabels } = require('../models/labels');

// mailController.js
const createMail = async (req, res) => {
    const { labels = ["inbox"] } = req.body;
    const { sender, recipient, recipients, subject, content } = req.body;

    // ----- build recipients list (back-compat) -----
    const recipientsList = Array.isArray(recipients)
        ? recipients
        : recipient
            ? [recipient]
            : [];

    // ----- basic validation -----
    if (recipientsList.length === 0 || !subject || !content) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    if (!inboxMap.has(sender)) {
        return res.status(400).json({ error: "Sender does not exist" });
    }
    if (sender !== req.user.email) {
        return res.status(403).json({ error: "Sender email does not match authenticated user" });
    }

    // make sure every recipient exists
    for (const r of recipientsList) {
        if (!inboxMap.has(r)) {
            return res.status(400).json({ error: `Recipient does not exist: ${r}` });
        }
    }

    // ----- blacklist check (once for whole message) -----
    try {
        const urls = extractUrls(`${subject} ${content}`);
        const results = await Promise.all(urls.map(checkUrlBlacklist));
        if (results.includes(true)) {
            return res.status(400).json({ error: "Message contains blacklisted URL" });
        }
    } catch (err) {
        console.error("Error while checking blacklist:", err);
        return res.status(500).json({ error: "Failed to validate message links" });
    }

    // ----- create and deliver a copy per recipient -----
    const sent = [];
    for (const r of recipientsList) {
        const mail = {
            id: uuidv4(),
            sender,
            recipient: r,
            subject,
            content,
            labels,
            timestamp: new Date().toISOString(),
        };
        inboxMap.get(r).push(mail);
        sent.push(mail);
    }

    return res.status(201).json({ message: "Mail sent successfully", sent });
};
// This function retrieves the mails for the authenticated user, including both inbox and sent mails.
const getMails = (req, res) => {
    try {
        if (!req.user || !req.user.email) {
            return res.status(401).json({ error: "Unauthorized: missing user data" });
        }

        const userEmail = req.user.email;

        if (!inboxMap || inboxMap.size === 0) {
            return res.status(200).json({ message: "No mails exist in the system", inbox: [], sent: [] });
        }

        const inbox = inboxMap.get(userEmail) || [];

        const sent = [];
        for (const [recipient, mails] of inboxMap.entries()) {
            mails.forEach(mail => {
                if (mail.sender === userEmail) {
                    sent.push(mail);
                }
            });
        }

        if (inbox.length === 0 && sent.length === 0) {
            return res.status(200).json({ message: "No mails found for this user", inbox: [], sent: [] });
        }
        // Sort by timestamp (descending) and limit to the latest 50 mails
        const sorted = inbox.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const recent_mails = sorted.slice(0, 50).map(mail => ({
            id: mail.id,
            subject: mail.subject,
            timestamp: mail.timestamp,
            direction: mail.sender === userEmail ? 'sent' : 'received',

        }));


        res.status(200).json({
            message: "Mails fetched successfully",
            recent_mails,
            sent
        });

    } catch (err) {
        console.error("Failed to fetch mails:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
// This function retrieves a mail by its ID if the user is authorized (as sender or recipient).
function getMailById(req, res) {
    const userEmail = req.user.email;
    const mailId = req.params.id;

    if (!mailId) {
        return res.status(400).json({ error: "Missing mail ID" });
    }

    for (const inbox of inboxMap.values()) {
        for (const mail of inbox) {
            if (mail.id === mailId) {
                if (mail.sender === userEmail || mail.recipient === userEmail) {
                    return res.status(200).json({
                        id: mail.id,
                        sender: mail.sender,
                        recipient: mail.recipient,
                        subject: mail.subject,
                        content: mail.content,
                        timestamp: mail.timestamp,
                        labels: mail.labels?.[userEmail] || []
                    });
                } else {
                    return res.status(403).json({ error: "You are not authorized to view this mail" });
                }
            }
        }
    }

    return res.status(404).json({ error: "Mail not found" });
}


// PATCH /api/mails/:id      
function updateMail(req, res) {
    const userEmail = req.user.email;
    const mailId = req.params.id;

    if (!mailId) {
        return res.status(400).json({ error: "Missing mail ID" });
    }
    // Validate that at least one field is provided for update
    const { subject, content } = req.body;
    if (subject === undefined && content === undefined) {
        return res.status(400).json({ error: "Nothing to update" });
    }

    for (const inbox of inboxMap.values()) {
        for (let mail of inbox) {
            if (mail.id === mailId) {

                if (mail.sender !== userEmail) {
                    return res.status(403).json({ error: "Only sender may edit subject or content" });
                }

                if (subject !== undefined) mail.subject = subject;
                if (content !== undefined) mail.content = content;

                return res.status(200).json({ message: "Mail updated", mail });
            }
        }
    }
    return res.status(404).json({ error: "Mail not found" });
}

// This function deletes a mail by its ID if the user is authorized (as sender or recipient).
function deleteMailById(req, res) {
    const userEmail = req.user.email; // Extracted from JWT
    const mailId = req.params.id;

    if (!mailId) {
        return res.status(400).json({ error: "Missing mail ID" });
    }

    let mailFound = false;

    // Iterate through inboxMap and remove the mail if it belongs to the user
    for (const [username, inbox] of inboxMap.entries()) {
        const index = inbox.findIndex(mail => mail.id === mailId);

        if (index !== -1) {
            const mail = inbox[index];

            // Allow deletion only if the current user is sender or recipient
            if (mail.sender === userEmail || mail.recipient === userEmail) {
                inbox.splice(index, 1);
                mailFound = true;
                console.log(`Mail ${mailId} deleted for user '${username}'`);
            }
        }
    }

    if (mailFound) {
        return res.status(200).json({ message: "Mail deleted successfully" });
    } else {
        return res.status(404).json({ error: "Mail not found or not authorized to delete" });
    }
}

// This function searches for mails that match a query string in the user's inbox
function searchMails(req, res) {
    const userEmail = req.user.email;
    const query = req.params.query;

    if (!query) {
        return res.status(400).json({ error: "Missing search query" });
    }
    const q = query.toLowerCase();
    const inbox = inboxMap.get(userEmail) || [];

    const sent = [];
    for (const mails of inboxMap.values()) {
        for (const mail of mails) {
            if (mail.sender === userEmail) {
                sent.push(mail);
            }
        }
    }

    const combined = inbox.concat(sent);

    const results = combined.filter(mail => {
        const subject = mail.subject?.toLowerCase() || "";
        const content = mail.content?.toLowerCase() || "";
        const sender = mail.sender?.toLowerCase() || "";
        const recipient = mail.recipient?.toLowerCase() || "";

        return (
            subject.includes(q) ||
            content.includes(q) ||
            sender.includes(q) ||
            recipient.includes(q)
        );
    });

    if (results.length === 0) {
        return res.status(404).json({ error: "No matching mails found" });
    }

    return res.json(results.map(mail => ({
        id: mail.id,
        subject: mail.subject,
        timestamp: mail.timestamp,
        direction: mail.sender === userEmail ? "sent" : "received"
    })));
}
// This function updates the labels for a specific mail for the authenticated user.
function updateMailLabelsForUser(req, res) {
    console.log("Reached updateMailLabelsForUser with id:", req.params.id);
    const userEmail = req.user.email;
    const mailId = req.params.id;
    const { labels } = req.body;


    if (!Array.isArray(labels)) {
        return res.status(400).json({ error: "Labels must be an array" });
    }

    for (const inbox of inboxMap.values()) {
        for (let mail of inbox) {
            if (mail.id === mailId) {


                if (mail.sender !== userEmail && mail.recipient !== userEmail) {
                    return res.status(403).json({ error: "Not authorized for this mail" });
                }


                const allowed = getAllLabels(userEmail).map(l => l.name.toLowerCase());
                const invalid = labels.filter(l => !allowed.includes(l.toLowerCase()));

                if (invalid.length > 0) {
                    return res.status(400).json({
                        error: `Invalid labels for user: ${invalid.join(", ")}`
                    });
                }


                if (!mail.labels || typeof mail.labels !== 'object') {
                    mail.labels = {};
                }

                mail.labels[userEmail] = labels;
                return res.status(200).json({ message: "Labels updated", labels: mail.labels[userEmail] });
            }
        }
    }

    return res.status(404).json({ error: "Mail not found" });
}


// This module provides functions to manage mails in an in-memory store.
// It includes creating, retrieving, updating, deleting, and searching mails.
module.exports = {
    createMail,
    getMails,
    getMailById,
    updateMail,
    deleteMailById,
    searchMails,
    updateMailLabelsForUser,
    inboxMap,
};
