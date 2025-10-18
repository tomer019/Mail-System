package com.example.gmailapplication;

import android.app.AlertDialog;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.example.gmailapplication.API.BackendClient;
import com.example.gmailapplication.API.EmailAPI;
import com.example.gmailapplication.shared.Email;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class EmailDetailActivity extends AppCompatActivity {

    private static final int MANAGE_LABELS_REQUEST_CODE = 100;

    private TextView tvSender, tvSubject, tvContent, tvTimestamp, tvRecipients, tvLabels;
    private LinearLayout layoutLabels;
    private ImageView ivSpamIndicator;
    private Toolbar toolbar;

    private String emailId;
    private String sender;
    private String subject;
    private String content;
    private String timestamp;
    private List<String> currentLabels = new ArrayList<>();

    private EmailAPI emailAPI;
    private TextView tvSenderAvatar;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_email_detail);

        System.out.println("=== EMAIL DETAIL ACTIVITY STARTED ===");

        initViews();
        setupToolbar();
        initAPI();
        loadEmailData();
        loadFullEmailFromServer(); // Load full email including labels
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadFullEmailFromServer();
    }

    private void initViews() {
        toolbar = findViewById(R.id.toolbar);
        tvSender = findViewById(R.id.tvSender);
        tvSubject = findViewById(R.id.tvSubject);
        tvContent = findViewById(R.id.tvContent);
        tvTimestamp = findViewById(R.id.tvTimestamp);
        tvRecipients = findViewById(R.id.tvRecipients);
        tvLabels = findViewById(R.id.tvLabels);
        layoutLabels = findViewById(R.id.layoutLabels);
        ivSpamIndicator = findViewById(R.id.ivSpamIndicator);
        tvSenderAvatar = findViewById(R.id.tvSenderAvatar);

        Button btnReply = findViewById(R.id.btnReply);
        btnReply.setOnClickListener(v -> openReply());

        Button btnReportSpam = findViewById(R.id.btnReportSpam);
        btnReportSpam.setText("Report as Spam");
        btnReportSpam.setOnClickListener(v -> reportAsSpam());

        Button btnManageLabels = findViewById(R.id.btnManageLabels);
        btnManageLabels.setOnClickListener(v -> openManageLabels());
    }

    private void reportAsSpam() {
        System.out.println("=== REPORT AS SPAM CLICKED ===");
        new AlertDialog.Builder(this)
                .setTitle("Report spam")
                .setMessage("Move this message to Spam and block future emails from " + sender + "?")
                .setIcon(android.R.drawable.ic_dialog_alert)
                .setPositiveButton("Report spam", (dialog, which) -> {
                    // Step 1: Move email to spam
                    moveEmailToSpam();

                    // Step 2: Extract URLs and add to blacklist
                    extractAndBlockUrls();

                    Toast.makeText(this, "Message reported as spam", Toast.LENGTH_SHORT).show();
                    finish(); // Return to email list
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void moveEmailToSpam() {
        EmailAPI emailAPI = BackendClient.get(this).create(EmailAPI.class);

        // Add spam label to email
        EmailAPI.AddLabelRequest request = new EmailAPI.AddLabelRequest("spam");

        emailAPI.addLabelToEmail(emailId, request).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(Call<Void> call, Response<Void> response) {
                System.out.println("Move to spam result: " + response.isSuccessful());
            }

            @Override
            public void onFailure(Call<Void> call, Throwable t) {
                System.out.println("Failed to move to spam: " + t.getMessage());
            }
        });
    }

    private void extractAndBlockUrls() {
        System.out.println("=== EXTRACT AND BLOCK URLS ===");

        // Combine subject and content for checking
        String fullText = "";
        if (subject != null) {
            fullText += subject + " ";
        }
        if (content != null) {
            fullText += content;
        }

        System.out.println("Full text to check: " + fullText);

        if (fullText.isEmpty()) return;

        // Extract URLs from full text
        String urlPattern = "https?://[^\\s]+";
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(urlPattern);
        java.util.regex.Matcher matcher = pattern.matcher(fullText);

        EmailAPI emailAPI = BackendClient.get(this).create(EmailAPI.class);

        while (matcher.find()) {
            String url = matcher.group();
            System.out.println("Found URL: " + url);

            EmailAPI.BlacklistRequest request = new EmailAPI.BlacklistRequest(
                    url,
                    "Reported as spam from email: " + subject
            );

            emailAPI.addToBlacklist(request).enqueue(new Callback<Void>() {
                @Override
                public void onResponse(Call<Void> call, Response<Void> response) {
                    System.out.println("URL blocked: " + url);
                }

                @Override
                public void onFailure(Call<Void> call, Throwable t) {
                    System.out.println("Failed to block URL: " + url);
                }
            });
        }
    }

    private void testBlacklistAPI() {
        EmailAPI emailAPI = BackendClient.get(this).create(EmailAPI.class);

        // Simple test - add URL to blacklist
        EmailAPI.BlacklistRequest request = new EmailAPI.BlacklistRequest(
                "http://test-spam.com",
                "Test from Android app"
        );

        emailAPI.addToBlacklist(request).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(Call<Void> call, Response<Void> response) {
                if (response.isSuccessful()) {
                    Toast.makeText(EmailDetailActivity.this,
                            "URL added to blacklist", Toast.LENGTH_SHORT).show();
                } else {
                    Toast.makeText(EmailDetailActivity.this,
                            "Error: " + response.code(), Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<Void> call, Throwable t) {
                Toast.makeText(EmailDetailActivity.this,
                        "Network error: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void initAPI() {
        emailAPI = BackendClient.get(this).create(EmailAPI.class);
    }

    private void openReply() {
        Intent intent = new Intent(this, ComposeActivity.class);
        intent.putExtra("reply_to", sender);
        intent.putExtra("reply_subject", "Re: " + subject);
        intent.putExtra("reply_content", "\n\n--- Reply to original message ---\n" + content);
        startActivity(intent);
    }

    private void openManageLabels() {
        if (emailId != null && !emailId.isEmpty()) {
            System.out.println("=== OPENING MANAGE LABELS ===");
            System.out.println("Current labels to pass: " + currentLabels);
            System.out.println("Email ID: " + emailId);
            System.out.println("=============================");

            ManageLabelsActivity.start(this, emailId, currentLabels);
        } else {
            Toast.makeText(this, "Unable to manage labels - missing email ID", Toast.LENGTH_SHORT).show();
        }
    }

    private void setupToolbar() {
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setTitle("Email Details");
        }
    }

    private void loadEmailData() {
        // Get data from Intent (basic data)
        emailId = getIntent().getStringExtra("email_id");
        sender = getIntent().getStringExtra("sender");
        subject = getIntent().getStringExtra("subject");
        content = getIntent().getStringExtra("content");
        timestamp = getIntent().getStringExtra("timestamp");

        System.out.println("=== LOADED EMAIL DATA ===");
        System.out.println("ID: " + emailId);
        System.out.println("Sender: " + sender);
        System.out.println("Subject: " + subject);
        System.out.println("Content length: " + (content != null ? content.length() : 0));
        System.out.println("========================");

        // Display basic data immediately
        displayBasicEmailData();
    }

    private void loadFullEmailFromServer() {
        if (emailId == null || emailId.isEmpty()) {
            System.out.println("No email ID - cannot load full email data");
            return;
        }

        System.out.println("=== LOADING FULL EMAIL FROM SERVER ===");
        System.out.println("Email ID: " + emailId);

        emailAPI.getEmailById(emailId).enqueue(new Callback<Email>() {
            @Override
            public void onResponse(Call<Email> call, Response<Email> response) {
                System.out.println("=== SERVER RESPONSE DEBUG ===");
                System.out.println("Response code: " + response.code());
                System.out.println("Response successful: " + response.isSuccessful());

                if (response.isSuccessful() && response.body() != null) {
                    Email fullEmail = response.body();

                    System.out.println("Full email received:");
                    System.out.println("- ID: " + fullEmail.id);
                    System.out.println("- Subject: " + fullEmail.subject);
                    System.out.println("- Sender: " + fullEmail.sender);
                    System.out.println("- Labels (raw): " + fullEmail.labels);
                    System.out.println("- Labels type: " + (fullEmail.labels != null ? fullEmail.labels.getClass() : "null"));
                    System.out.println("- Labels size: " + (fullEmail.labels != null ? fullEmail.labels.size() : "null"));

                    if (fullEmail.labels != null) {
                        for (int i = 0; i < fullEmail.labels.size(); i++) {
                            System.out.println("  Label[" + i + "]: '" + fullEmail.labels.get(i) + "' (type: " + fullEmail.labels.get(i).getClass() + ")");
                        }
                    }

                    currentLabels = fullEmail.labels != null ? new ArrayList<>(fullEmail.labels) : new ArrayList<>();
                    System.out.println("currentLabels set to: " + currentLabels);

                    displayFullEmailData(fullEmail);
                } else {
                    System.err.println("Failed to load full email data: " + response.code());
                    try {
                        if (response.errorBody() != null) {
                            System.err.println("Error body: " + response.errorBody().string());
                        }
                    } catch (Exception e) {
                        System.err.println("Could not read error body: " + e.getMessage());
                    }
                }
                System.out.println("=============================");
            }

            @Override
            public void onFailure(Call<Email> call, Throwable t) {
                System.err.println("=== SERVER FAILURE ===");
                System.err.println("Error loading full email data: " + t.getMessage());
                t.printStackTrace();
                System.err.println("=====================");
            }
        });
    }

    private void displayBasicEmailData() {
        // Display basic data in UI
        tvSender.setText("From: " + (sender != null ? sender : "Unknown"));
        tvSubject.setText(subject != null ? subject : "(No subject)");
        tvContent.setText(content != null ? content : "(No content)");

        // Simple time format (for now)
        if (timestamp != null && timestamp.length() > 10) {
            String timeOnly = timestamp.substring(11, 16); // HH:MM
            String dateOnly = timestamp.substring(0, 10);  // YYYY-MM-DD
            tvTimestamp.setText(dateOnly + " " + timeOnly);
        } else {
            tvTimestamp.setText("Time unknown");
        }
    }

    private void displayFullEmailData(Email email) {
        // Update data that might be different from Intent data
        if (email.subject != null) {
            tvSubject.setText(email.subject);
        }
        if (email.content != null) {
            tvContent.setText(email.content);
        }
        if (email.sender != null) {
            tvSender.setText("From: " + email.sender);
            // Add avatar logic
            setupSenderAvatar(email.sender);
        }

        // Critical: Update currentLabels
        currentLabels = email.labels != null ? new ArrayList<>(email.labels) : new ArrayList<>();

        System.out.println("=== UPDATED CURRENT LABELS ===");
        System.out.println("Labels from server: " + email.labels);
        System.out.println("Current labels set to: " + currentLabels);
        System.out.println("==============================");

        // Display recipients if any
        if (email.recipients != null && !email.recipients.isEmpty()) {
            StringBuilder recipientsStr = new StringBuilder("To: ");
            for (int i = 0; i < email.recipients.size(); i++) {
                if (i > 0) recipientsStr.append(", ");
                recipientsStr.append(email.recipients.get(i));
            }
            tvRecipients.setText(recipientsStr.toString());
            tvRecipients.setVisibility(View.VISIBLE);
        } else {
            tvRecipients.setVisibility(View.GONE);
        }

        // Display labels
        displayLabels(currentLabels);

        // Check for spam
        checkForSpamIndicator(currentLabels);

        // Check email state (trash/draft)
        boolean isInTrash = email.labels != null && email.labels.contains("trash");
        boolean isDraft = email.labels != null && email.labels.contains("drafts");

        configureUIForEmailState(isInTrash, isDraft, email);
    }

    // Add new method for avatar setup:
    private void setupSenderAvatar(String senderEmail) {
        if (senderEmail != null && !senderEmail.isEmpty()) {
            String firstLetter = senderEmail.substring(0, 1).toUpperCase();
            tvSenderAvatar.setText(firstLetter);

            // Dynamic background color based on first letter (same logic as EmailAdapter)
            int[] colors = {
                    android.graphics.Color.parseColor("#1a73e8"), // Blue
                    android.graphics.Color.parseColor("#34a853"), // Green
                    android.graphics.Color.parseColor("#fbbc04"), // Yellow
                    android.graphics.Color.parseColor("#ea4335"), // Red
                    android.graphics.Color.parseColor("#9c27b0"), // Purple
                    android.graphics.Color.parseColor("#ff6f00"), // Orange
            };

            int colorIndex = Math.abs(firstLetter.hashCode()) % colors.length;
            tvSenderAvatar.setBackgroundColor(colors[colorIndex]);
        }
    }

    // Add new method for UI state management:
    private void configureUIForEmailState(boolean isInTrash, boolean isDraft, Email email) {
        Button btnReply = findViewById(R.id.btnReply);
        Button btnManageLabels = findViewById(R.id.btnManageLabels);
        View cardTrashNotice = findViewById(R.id.cardTrashNotice);

        if (isInTrash) {
            // Email in trash - hide reply and label management
            btnReply.setVisibility(View.GONE);
            btnManageLabels.setVisibility(View.GONE);
            cardTrashNotice.setVisibility(View.VISIBLE);
        } else if (isDraft) {
            // Draft - show edit button instead of reply
            btnReply.setText("Edit Draft");
            btnReply.setOnClickListener(v -> editDraft(email));
            btnManageLabels.setVisibility(View.VISIBLE);
            cardTrashNotice.setVisibility(View.GONE);
        } else {
            // Regular email - show everything
            btnReply.setVisibility(View.VISIBLE);
            btnManageLabels.setVisibility(View.VISIBLE);
            cardTrashNotice.setVisibility(View.GONE);
        }
    }

    private void editDraft(Email email) {
        Intent intent = new Intent(this, ComposeActivity.class);
        intent.putExtra("is_draft", true);
        intent.putExtra("draft_id", email.id);
        intent.putExtra("draft_to", email.recipients != null ? String.join(", ", email.recipients) : "");
        intent.putExtra("draft_subject", email.subject);
        intent.putExtra("draft_content", email.content);
        startActivity(intent);
    }

    private void displayLabels(List<String> labels) {
        if (labels != null && !labels.isEmpty()) {
            StringBuilder labelsStr = new StringBuilder();
            for (int i = 0; i < labels.size(); i++) {
                if (i > 0) labelsStr.append(", ");
                labelsStr.append(labels.get(i));
            }
            tvLabels.setText(labelsStr.toString());
            layoutLabels.setVisibility(View.VISIBLE);
        } else {
            layoutLabels.setVisibility(View.GONE);
        }
    }

    private void checkForSpamIndicator(List<String> labels) {
        boolean isSpam = labels != null && labels.contains("spam");
        ivSpamIndicator.setVisibility(isSpam ? View.VISIBLE : View.GONE);

        if (isSpam) {
            // Maybe change subject color or add warning
            tvSubject.setTextColor(getResources().getColor(android.R.color.holo_red_dark));
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == MANAGE_LABELS_REQUEST_CODE && resultCode == RESULT_OK) {
            // Labels updated - refresh display
            if (data != null) {
                ArrayList<String> updatedLabels = data.getStringArrayListExtra("updated_labels");
                if (updatedLabels != null) {
                    currentLabels = updatedLabels;
                    displayLabels(currentLabels);
                    checkForSpamIndicator(currentLabels);

                    Toast.makeText(this, "Labels updated successfully", Toast.LENGTH_SHORT).show();
                }
            }
        }
    }

    @Override
    public boolean onSupportNavigateUp() {
        // Return to previous screen when back button is pressed
        onBackPressed();
        return true;
    }
}