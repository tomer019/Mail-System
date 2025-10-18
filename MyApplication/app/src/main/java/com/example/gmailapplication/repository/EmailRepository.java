package com.example.gmailapplication.repository;

import android.content.Context;

import androidx.lifecycle.LiveData;

import com.example.gmailapplication.API.BackendClient;
import com.example.gmailapplication.API.EmailAPI;
import com.example.gmailapplication.data.AppDatabase;
import com.example.gmailapplication.data.dao.EmailDao;
import com.example.gmailapplication.shared.Email;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class EmailRepository {
    private EmailAPI emailAPI;
    private EmailDao emailDao;

    public EmailRepository(Context context) {
        emailAPI = BackendClient.get(context).create(EmailAPI.class);
        emailDao = AppDatabase.getInstance(context).emailDao();
        System.out.println("ROOM: EmailDao initialized successfully");
    }

    // Expose the API for ViewModel
    public EmailAPI getEmailAPI() {
        return emailAPI;
    }

    // All emails (inbox, sent, drafts)
    public Call<EmailAPI.EmailListResponse> getEmails() {
        return emailAPI.getEmails();
    }

    // Emails by label
    public Call<EmailAPI.MailsByLabelResponse> getEmailsByLabel(String labelName) {
        return emailAPI.getMailsByLabel(labelName);
    }

    // Starred emails
    public Call<EmailAPI.MailsByLabelResponse> getStarredEmails() {
        return emailAPI.getStarredMails();
    }

    // Spam emails
    public Call<EmailAPI.MailsByLabelResponse> getSpamEmails() {
        return emailAPI.getSpamMails();
    }

    // Search emails
    public Call<java.util.List<com.example.gmailapplication.shared.Email>> searchEmails(String query) {
        return emailAPI.searchEmails(query);
    }

    // Send email
    public Call<Void> sendEmail(com.example.gmailapplication.shared.SendEmailRequest request) {
        return emailAPI.sendEmail(request);
    }

    // Get email by ID
    public Call<com.example.gmailapplication.shared.Email> getEmailById(String emailId) {
        return emailAPI.getEmailById(emailId);
    }

    public LiveData<List<Email>> getEmailsWithRoom() {
        // Refresh in background from server
        refreshEmailsFromServer();
        // Return from Room
        return emailDao.getAllEmailsLive();
    }

    private void refreshEmailsFromServer() {
        System.out.println("=== ROOM DEBUG 1: refreshEmailsFromServer called ===");

        emailAPI.getEmails().enqueue(new Callback<EmailAPI.EmailListResponse>() {
            @Override
            public void onResponse(Call<EmailAPI.EmailListResponse> call, Response<EmailAPI.EmailListResponse> response) {
                System.out.println("=== ROOM DEBUG 2: onResponse called ===");
                System.out.println("Response successful: " + response.isSuccessful());

                if (response.isSuccessful() && response.body() != null) {
                    System.out.println("=== ROOM DEBUG 3: About to save to Room ===");
                    System.out.println("ROOM: Server response received, saving to Room");

                    // Save to Room in background
                    new Thread(() -> {
                        try {
                            System.out.println("=== ROOM DEBUG 4: Inside Room thread ===");
                            emailDao.deleteAll();
                            if (response.body().inbox != null) {
                                emailDao.insertEmails(response.body().inbox);
                                System.out.println("=== ROOM DEBUG 5: Emails saved to Room ===");
                                System.out.println("ROOM: Saved " + response.body().inbox.size() + " emails to Room");
                                System.out.println("ROOM: About to trigger LiveData update");
                            }
                        } catch (Exception e) {
                            System.err.println("=== ROOM DEBUG ERROR: " + e.getMessage() + " ===");
                            System.err.println("ROOM: Error saving to database: " + e.getMessage());
                            e.printStackTrace();
                        }
                    }).start();
                } else {
                    System.err.println("=== ROOM DEBUG 3B: API failed ===");
                    System.err.println("ROOM: Server response failed: " + response.code());
                }
            }

            @Override
            public void onFailure(Call<EmailAPI.EmailListResponse> call, Throwable t) {
                System.err.println("=== ROOM DEBUG FAILURE: " + t.getMessage() + " ===");
                System.err.println("ROOM: Network failure: " + t.getMessage());
            }
        });
    }
}