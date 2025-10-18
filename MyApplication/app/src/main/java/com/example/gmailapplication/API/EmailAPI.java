package com.example.gmailapplication.API;

import com.example.gmailapplication.shared.Email;
import com.example.gmailapplication.shared.EmailResponse;
import com.example.gmailapplication.shared.SendEmailRequest;
import com.example.gmailapplication.shared.SendEmailResponse;
import com.example.gmailapplication.shared.UpdateLabelsRequest;

import java.util.List;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.DELETE;
import retrofit2.http.GET;
import retrofit2.http.PATCH;
import retrofit2.http.POST;
import retrofit2.http.Path;
import retrofit2.http.Query;

public interface EmailAPI {

    // Response class
    class EmailListResponse {
        public String message;
        public List<Email> inbox;
        public List<Email> sent;
        public List<Email> drafts;
        public List<Email> recent_mails;
    }

    // All emails (inbox, sent, drafts) - returns new response from server
    @GET("mails")
    Call<EmailListResponse> getEmails();

    // Send email
    @POST("mails")
    Call<Void> sendEmail(@Body SendEmailRequest request);

    // Specific email
    @GET("mails/{id}")
    Call<Email> getEmailById(@Path("id") String emailId);

    // Search emails
    @GET("mails/search")
    Call<List<Email>> searchEmails(@Query("q") String query);

    // Update email labels (adapted to new server)
    @PATCH("mails/{id}/labels")
    Call<Void> updateEmailLabels(@Path("id") String emailId, @Body UpdateLabelsRequest request);

    // Delete email
    @DELETE("mails/{id}")
    Call<Void> deleteEmail(@Path("id") String emailId);

    // === New API from server ===

    // Archive email (remove inbox label)
    @POST("mails/{id}/archive")
    Call<Void> archiveEmail(@Path("id") String emailId);

    // Add/remove star
    @POST("mails/{id}/star")
    Call<Void> toggleStarEmail(@Path("id") String emailId);

    // Add single label
    @POST("mails/{id}/add-label")
    Call<Void> addLabelToEmail(@Path("id") String emailId, @Body AddLabelRequest request);

    // Remove single label
    @POST("mails/{id}/remove-label")
    Call<Void> removeLabelFromEmail(@Path("id") String emailId, @Body RemoveLabelRequest request);

    // Emails by label (from new server)
    @GET("mails/label/{label}")
    Call<MailsByLabelResponse> getMailsByLabel(@Path("label") String labelName);

    // Starred emails
    @GET("mails/starred")
    Call<MailsByLabelResponse> getStarredMails();

    // Spam emails
    @GET("mails/spam")
    Call<MailsByLabelResponse> getSpamMails();

    // === Drafts ===

    // Create draft
    @POST("mails/drafts")
    Call<Void> createDraft(@Body SendEmailRequest request);

    // Send draft
    @POST("mails/drafts/{id}/send")
    Call<Void> sendDraft(@Path("id") String draftId);

    // Get drafts
    @GET("mails/drafts")
    Call<DraftsResponse> getDrafts();

    @DELETE("mails/{id}/permanent")
    Call<Void> deleteEmailPermanently(@Path("id") String emailId);
    // Update email/draft
    @PATCH("mails/{id}")
    Call<Void> updateEmail(@Path("id") String emailId, @Body SendEmailRequest request);

    // === Blacklist Management ===
    @GET("blacklist")
    Call<BlacklistResponse> getBlacklist();

    @POST("blacklist")
    Call<Void> addToBlacklist(@Body BlacklistRequest request);

    @DELETE("blacklist/{encodedUrl}")
    Call<Void> removeFromBlacklist(@Path("encodedUrl") String encodedUrl);

    // === Request/Response classes ===

    class AddLabelRequest {
        public String labelName;

        public AddLabelRequest(String labelName) {
            this.labelName = labelName;
        }
    }

    class RemoveLabelRequest {
        public String labelName;

        public RemoveLabelRequest(String labelName) {
            this.labelName = labelName;
        }
    }

    class CreateDraftRequest {
        public String sender;
        public String recipient;
        public List<String> recipients;
        public String subject;
        public String content;

        public CreateDraftRequest(String sender, List<String> recipients, String subject, String content) {
            this.sender = sender;
            this.recipients = recipients;
            this.recipient = recipients != null && !recipients.isEmpty() ? recipients.get(0) : null;
            this.subject = subject;
            this.content = content;
        }
    }

    class MailsByLabelResponse {
        public String message;
        public List<Email> mails;
    }

    class DraftResponse {
        public String message;
        public Email draft;
    }

    class DraftsResponse {
        public String message;
        public List<Email> drafts;
    }



    // Request/Response classes for Blacklist
    class BlacklistRequest {
        public String url;
        public String reason;

        public BlacklistRequest(String url, String reason) {
            this.url = url;
            this.reason = reason;
        }
    }

    class BlacklistResponse {
        public String message;
        public int count;
        public List<BlacklistEntry> data;
    }

    class BlacklistEntry {
        public String url;
        public String reason;
        public String createdAt;
    }
}