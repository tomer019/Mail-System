const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { extractUrls } = require("../utils/extractUrls");
const { checkUrlBlacklist } = require("../utils/blacklistClient");
const inboxMap = require('../utils/inboxMap');
const { getAllLabels } = require('../models/labels');
const labelModel = require('../models/labels'); // Add in exercises 4 to support assigning labels to mails
const userModel = require("../models/userModel");
const { addUrlToBlacklist } = require("../utils/blacklistClient"); // Added by Meir in exercises 4 to support adding URLs to blacklist

// mailController.js
const createMail = async (req, res) => {

    let { labels = ["inbox"] } = req.body; // changed by Meir in exercise 4 from "const { labels = ["inbox"] } = req.body;"
    const { sender, recipient, recipients, subject, content, isDraft } = req.body; // Added isDraft by Meir in exercise 4 to support saving drafts
    const groupId = uuidv4();

    // ----- build recipients list (back-compat) -----
    const recipientsList = Array.isArray(recipients)
        ? recipients
        : recipient
            ? [recipient]
            : [];
    
    // ---------- NEW: normalize labels to *IDs* in the SENDER's namespace ----------
    // Runs before the draft branch, so drafts get the correct label id(s) too.
    const userLabels = getAllLabels(sender) || [];
    const resolveLabelId = (val) => {
      if (!val) return null;
      const asStr = String(val);
      // by id
      const byId = userLabels.find(l => l.id === asStr);
      if (byId) return byId.id;
      // by name (case-insensitive)
      const byName = userLabels.find(
        l => (l.name || "").toLowerCase() === asStr.toLowerCase()
      );
      if (byName) return byName.id;
      // create label if missing (e.g., "Drafts")
      try {
        return labelModel.createLabel(sender, asStr).id;
      } catch {
        return null;
      }
    };
    const finalLabelIds = (labels || []).map(resolveLabelId).filter(Boolean); // Meir draft issue
    // ------------------------------------------------------------------------------


    console.log("[createMail:init]", {
        authUser: req.user?.email,
        sender,
        recipientsList,
        isDraft,
        labels: finalLabelIds, // Meir draft issue
        groupId
    });

    // ----- basic validation -----

    /* Edited by Meir to allow empty subject and content. The old code was:
    if (recipientsList.length === 0 || !subject || !content) {*/
    if (!isDraft && recipientsList.length === 0) {
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
    /**************************************************************
    Added by Meir in exercise 4 to allow drafts with no recipients
    ***************************************************************/
     // ----- Handle drafts BEFORE blacklist check -----
    if (isDraft) {
        // For drafts, just save to sender's inbox with draft labels
        const mail = {
            id: uuidv4(),
            sender,
            recipient: recipientsList[0] || "", // Keep first recipient for compatibility
            recipients: recipientsList,
            subject,
            content,
            labels: finalLabelIds, // Meir draft issue
            groupId,
            timestamp: new Date().toISOString(),
            isDraft: true // Explicitly mark as draft
        };
        
        // Add draft to sender's inbox only
        inboxMap.get(sender).push(mail);
        
        // Assign labels to the mail
        finalLabelIds.forEach(labelId => { // Meir draft issue
            labelModel.addLabelToMail(sender, mail.id, labelId);
        });

        console.log("[createMail:draft] saved draft", {
            sender,
            groupId,
            labels: finalLabelIds // Meir draft issue
        });

        return res.status(201).json({ message: "Draft saved successfully", draft: mail });
    }

    // ----- blacklist check (once for whole message and only for actual sending, not drafts) -----
    let finalLabels = finalLabelIds; // Meir draft issue
    try {
        const urls = extractUrls(`${subject} ${content}`);
        const results = await Promise.all(urls.map(checkUrlBlacklist));
        if (results.includes(true)) {
            // add mail to spam for each recipient
            console.log("Message contains blacklisted URL, marking as spam");
            const spamLabelMap = new Map(); // key: recipient, value: spam label id
            for (const r of recipientsList) {
            let spamLabel = getAllLabels(r).find(l => l.name.toLowerCase() === "spam");
            if (!spamLabel) { // Edited by Meir to create the Spam label if it doesn't exist
                try {
                    spamLabel = labelModel.createLabel(r, "Spam"); 
                } catch (err) {
                    // If creation failed because label already exists, find it again
                    if (err.message && err.message.includes("already exists")) {
                        spamLabel = getAllLabels(r).find(l => l.name.toLowerCase() === "spam");
                        if (!spamLabel) {
                            // If still not found, something is wrong - log and skip this recipient
                            console.error(`Critical error: Spam label creation failed and label not found for user ${r}`);
                            continue;
                        }
                    } else {
                        // Different error, re-throw
                        throw err;
                    }
                }
            }
            spamLabelMap.set(r, spamLabel.id);
        }
        
        // Only proceed if we have spam labels for all recipients
        if (spamLabelMap.size !== recipientsList.length) {
            console.error("Failed to create spam labels for all recipients, aborting spam processing");
            return res.status(500).json({ error: "Failed to process spam labeling" });
        }
            const sent = [];
            for (const r of recipientsList) {
                const mail = {
                    id: uuidv4(),
                    sender,
                    recipient: r,
                    recipients: recipientsList,
                    subject,
                    content,
                    labels: [spamLabelMap.get(r)],
                    groupId,
                    timestamp: new Date().toISOString(),
                };
                console.log("[SPAM push:before] from=%s to=%s id=%s", sender, r, mail.id);
                inboxMap.get(r).push(mail);
                sent.push(mail);
                console.log("[SPAM push:after] inbox[%s].len=%d sent.len=%d",
                    r, (inboxMap.get(r) || []).length, sent.length);
                labelModel.addLabelToMail(sender, mail.id, spamLabelMap.get(r));
                labelModel.addLabelToMail(r, mail.id, spamLabelMap.get(r));
            }

            return res.status(201).json({ message: "Mail sent to spam", sent });
            /*const spamLabel = getAllLabels(r).find(l => l.name.toLowerCase() === "spam");
            const spamLabelId = spamLabel?.id;
             // override any other label
            if (!spamLabelId) {
                const newLabel = labelModel.addLabelToMail(r, "Spam");
                labels = [newLabel.id];
            } else {
                labels = [spamLabelId];
            }
            console.log("Marking message as spam, labels now:", labels);
            for (const r of recipientsList) {
                const userLabels = getAllLabels(r).map(l => l.name.toLowerCase());
                if (!userLabels.includes("spam")) {
                    labelModel.addLabel(r, "Spam");
                }
            } // override any other label*/
            /*
            *Edited by Meir for ex4.
            *Previous line:
            *return res.status(400).json({ error: "Message contains blacklisted URL" });
            */
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
            recipients: recipientsList, // Added by Meir to keep track of all recipients
            subject,
            content,
            labels: finalLabels, // Meir draft issue
            groupId, // Added by Tomer in exercises 4
            timestamp: new Date().toISOString(),
        };
        console.log("[DELIVER push:before] group=%s from=%s to=%s id=%s",
            groupId, sender, r, mail.id);
        inboxMap.get(r).push(mail);
        sent.push(mail);
        console.log("[DELIVER push:after] inbox[%s].len=%d sent.len=%d",
            r, (inboxMap.get(r) || []).length, sent.length);
        // Add in exercises 4, assign labels to the mail
        finalLabels.forEach(labelId => { // Meir draft issue
            labelModel.addLabelToMail(sender, mail.id, labelId);
        });
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


        const allofMyInbox = inboxMap.get(userEmail) || [];
        console.log(`=== All mails in ${userEmail}'s inbox ===`);
        allofMyInbox.forEach((mail, index) => {
            console.log(`[${index}] ID: ${mail.id}, Sender: ${mail.sender}, Recipients: ${JSON.stringify(mail.recipients || [mail.recipient])}, Subject: "${mail.subject}", GroupId: ${mail.groupId}`);
        });

        if (!inboxMap || inboxMap.size === 0) {
            return res.status(200).json({ 
                message: "No mails exist in the system", 
                inbox: [], 
                sent: [],
                recent_mails: []
            });
        }

        const allMyInbox = inboxMap.get(userEmail) || []; // edited by Meir to get all mails including drafts
        const inbox = allMyInbox.filter(m => m?.isDraft !== true); // exclude drafts from inbox view


        const sent = [];
        console.log(`=== Computing sent mails for ${userEmail} ===`);
        for (const [recipient, mails] of inboxMap.entries()) {
            console.log(`Checking inbox of ${recipient} (${mails.length} mails)`);
            mails.forEach(mail => {
                const isSentByUser = mail.sender === userEmail && mail?.isDraft !== true;
                console.log(`  Mail "${mail.subject}" - sender: ${mail.sender}, isDraft: ${mail.isDraft}, isSentByUser: ${isSentByUser}`);
                if (isSentByUser) {
                    // to prevent duplicates, check if mail is already in sent
                    if (!sent.some(existingMail => existingMail.id === mail.id)) {
                        sent.push(mail);
                        console.log(`    -> Added to sent!`);
                    } else {
                        console.log(`    -> Already exists in sent, skipping`);
                    }
                }
            });
        }
console.log(`Final sent array: ${sent.length} mails`);
        /*Edited by Meir. previous code was:*/
        /*const sent = [];
        for (const [recipient, mails] of inboxMap.entries()) {
            mails.forEach(mail => {
                if (mail.sender === userEmail) {
                    sent.push(mail);
                }
            });
        }*/

        if (inbox.length === 0 && sent.length === 0) {
            return res.status(200).json({ 
                message: "No mails found for this user", 
                inbox: [], 
                sent: [],
                recent_mails: []
            });
        }
        
        // Sort by timestamp (descending) and limit to the latest 50 mails
        const sorted = inbox.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const recent_mails = sorted.slice(0, 50).map(mail => {
            const isSent = mail.sender === userEmail;
            const otherEmail = isSent ? mail.recipient : mail.sender;
            const otherUser = userModel.findUserByEmail(otherEmail);

            return {
                id: mail.id,
                subject: mail.subject,
                timestamp: mail.timestamp,
                direction: isSent ? 'sent' : 'received',
                otherParty: otherUser
                    ? {
                        email: otherUser.email,
                        firstName: otherUser.firstName,
                        lastName: otherUser.lastName,
                        profileImage: otherUser.profileImage
                    }
                    : { email: otherEmail },
                preview: mail.content?.slice(0, 100) || ""
            };
        });

        res.status(200).json({
            message: "Mails fetched successfully",
            inbox: inbox,
            recent_mails,
            sent
        });

    } catch (err) {
        console.error("Failed to fetch mails:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
/*const getMails = (req, res) => {
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
        const recent_mails = sorted.slice(0, 50).map(mail => {
            const isSent = mail.sender === userEmail;
            const otherEmail = isSent ? mail.recipient : mail.sender;
            const otherUser = userModel.findUserByEmail(otherEmail);

            return {
                id: mail.id,
                subject: mail.subject,
                timestamp: mail.timestamp,
                direction: isSent ? 'sent' : 'received',
                otherParty: otherUser
                    ? {
                        email: otherUser.email,
                        firstName: otherUser.firstName,
                        lastName: otherUser.lastName,
                        profileImage: otherUser.profileImage
                    }
                    : { email: otherEmail },
                preview: mail.content?.slice(0, 100) || ""
            };
        });


        res.status(200).json({
            message: "Mails fetched successfully",
            recent_mails,
            sent
        });

    } catch (err) {
        console.error("Failed to fetch mails:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};*/
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
                    const senderUser = userModel.findUserByEmail(mail.sender);
                    const recipientUser = userModel.findUserByEmail(mail.recipient);
                    // Build recipient list with user details - added by Meir
                    const recipientList = Array.isArray(mail.recipients)
                        ? mail.recipients.map(email => {
                            const user = userModel.findUserByEmail(email);
                            return user
                                ? {
                                    email: user.email,
                                    firstName: user.firstName,
                                    lastName: user.lastName,
                                    profileImage: user.profileImage
                                }
                                : { email };
                        })
                        : [];
                    return res.status(200).json({
                        id: mail.id,
                        sender: senderUser
                            ? {
                                email: senderUser.email,
                                firstName: senderUser.firstName,
                                lastName: senderUser.lastName,
                                profileImage: senderUser.profileImage
                            }
                            : { email: mail.sender },
                        recipient: recipientUser
                            ? {
                                email: recipientUser.email,
                                firstName: recipientUser.firstName,
                                lastName: recipientUser.lastName,
                                profileImage: recipientUser.profileImage
                            }
                            : { email: mail.recipient },
                        recipients: recipientList, // Added by Meir
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
/*

// This function searches for mails that match a query string in the user's inbox
function searchMails(req, res) {
    const userEmail = req.user.email;
    const query = req.query.q;

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
    // Format the results to include only necessary fields branch309 exericice 4
    return res.json(results.map(mail => ({
        id: mail.id,
        subject: mail.subject,
        timestamp: mail.timestamp,
        direction: mail.sender === userEmail ? "sent" : "received",
        sender: mail.sender,
        recipient: mail.recipient,
        content: mail.content,
    })));

}
*/

function searchMails(req, res) {
    const userEmail = req.user.email;
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ error: "Missing search query" });
    }

    const q = query.toLowerCase();

    // user's inbox
    const inbox = inboxMap.get(userEmail) || [];

    // user's sent mails
    const sent = [];
    for (const mails of inboxMap.values()) {
        for (const mail of mails) {
            if (mail.sender === userEmail) {
                sent.push(mail);
            }
        }
    }

    // user's combined mails
    const combined = inbox.concat(sent);

    // filtering by search content
    const results = combined.filter(mail => {
        const subject = mail.subject?.toLowerCase() || "";
        const content = mail.content?.toLowerCase() || "";
        const sender = mail.sender?.toLowerCase() || "";

        const recipientsArray = Array.isArray(mail.recipients)
            ? mail.recipients
            : [mail.recipient];
        const recipientsJoined = recipientsArray.map(r => r.toLowerCase()).join(" ");

        return (
            subject.includes(q) ||
            content.includes(q) ||
            sender.includes(q) ||
            recipientsJoined.includes(q)
        );
    });

    if (results.length === 0) {
        return res.status(404).json({ error: "No matching mails found" });
    }

    // Removing duplicates by id (to avoid showing the same mail sent to a group multiple times)
    // Filtering duplicate results by groupId
    const seenGroups = new Set();
    const uniqueResults = results.filter(mail => {
        if (mail.groupId && seenGroups.has(mail.groupId)) return false;
        seenGroups.add(mail.groupId || mail.id); // fallback for older mails
        return true;
    });


    // recipienrs as array
    return res.json(uniqueResults.map(mail => ({
        id: mail.id,
        subject: mail.subject,
        timestamp: mail.timestamp,
        direction: mail.sender === userEmail ? "sent" : "received",
        sender: mail.sender,
        recipients: Array.isArray(mail.recipients) ? mail.recipients : [mail.recipient],
        content: mail.content,
    })));
}


// This function updates the labels for a specific mail for the authenticated user.
async function updateMailLabelsForUser(req, res) { // became async by Meir in ex4 to support adding URLs to blacklist
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
                //If the mail added to the Spam label, add URLs to the blacklist. Added by Meir in ex4
                const previousLabels = mail.labels[userEmail] || [];
                const addedSpam = !previousLabels.map(l => l.toLowerCase()).includes("spam") &&
                  labels.map(l => l.toLowerCase()).includes("spam");
                if (addedSpam) {
                    console.log("[SpamLabel] Spam label was added manually");
                    const urls = extractUrls(`${mail.subject} ${mail.content}`);
                    console.log("[SpamLabel] Extracted URLs:", urls);
                    for (const url of urls) {
                        try {
                            await addUrlToBlacklist(url);
                            console.log(`Added URL to blacklist: ${url}`);
                        } catch (err) {
                            console.error(`Failed to add URL to blacklist: ${url}`, err.message);
                        }
                    }
                }

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
