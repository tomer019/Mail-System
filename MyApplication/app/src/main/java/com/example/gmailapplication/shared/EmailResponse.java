package com.example.gmailapplication.shared;

import java.util.List;

/**
 * New response structure from server (adapted to MongoDB structure)
 * Server returns: { message, inbox, sent, drafts, recent_mails }
 */
public class EmailResponse {
    public String message;
    public List<Email> inbox;        // Emails in inbox
    public List<Email> sent;         // Sent emails
    public List<Email> drafts;       // Drafts
    public List<Email> recent_mails; // Recent emails (for quick display)

    public EmailResponse() {}

    /**
     * Returns all emails merged (excludes drafts)
     */
    public List<Email> getAllMails() {
        List<Email> allMails = new java.util.ArrayList<>();

        if (inbox != null) {
            allMails.addAll(inbox);
        }

        if (sent != null) {
            allMails.addAll(sent);
        }

        return allMails;
    }

    /**
     * Returns only inbox emails
     */
    public List<Email> getInboxMails() {
        return inbox != null ? inbox : new java.util.ArrayList<>();
    }

    /**
     * Returns only sent emails
     */
    public List<Email> getSentMails() {
        return sent != null ? sent : new java.util.ArrayList<>();
    }

    /**
     * Returns only drafts
     */
    public List<Email> getDraftMails() {
        return drafts != null ? drafts : new java.util.ArrayList<>();
    }

    /**
     * Returns recent emails (for quick display)
     */
    public List<Email> getRecentMails() {
        return recent_mails != null ? recent_mails : new java.util.ArrayList<>();
    }

    @Override
    public String toString() {
        int inboxCount = inbox != null ? inbox.size() : 0;
        int sentCount = sent != null ? sent.size() : 0;
        int draftsCount = drafts != null ? drafts.size() : 0;

        return "EmailResponse{" +
                "message='" + message + '\'' +
                ", inbox=" + inboxCount +
                ", sent=" + sentCount +
                ", drafts=" + draftsCount +
                '}';
    }
}