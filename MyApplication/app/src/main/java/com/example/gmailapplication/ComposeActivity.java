package com.example.gmailapplication;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.Menu;
import android.view.MenuItem;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.example.gmailapplication.API.BackendClient;
import com.example.gmailapplication.API.EmailAPI;
import com.example.gmailapplication.shared.SendEmailRequest;

import java.util.Arrays;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ComposeActivity extends AppCompatActivity {

    private EditText etTo, etSubject, etContent;
    private Toolbar toolbar;

    private EmailAPI emailAPI;
    private String authToken;
    private String currentUserEmail;

    private boolean isSending = false;
    private Button btnSend, btnSaveDraft;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_compose);

        initViews();
        setupToolbar();
        setupAPI();
        handleReplyData();
        setupBackPressHandler();

        // New buttons
        btnSend = findViewById(R.id.btnSend);
        btnSaveDraft = findViewById(R.id.btnSaveDraft);

        // Setup listeners
        btnSend.setOnClickListener(v -> sendDraftOrEmail());
        btnSaveDraft.setOnClickListener(v -> saveDraftToServer());
    }

    private void initViews() {
        toolbar = findViewById(R.id.toolbar);
        etTo = findViewById(R.id.etTo);
        etSubject = findViewById(R.id.etSubject);
        etContent = findViewById(R.id.etContent);
    }

    private void setupToolbar() {
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setTitle("Compose Email");
        }
    }

    private void saveDraftToServer() {
        String to = etTo.getText().toString().trim();
        String subject = etSubject.getText().toString().trim();
        String content = etContent.getText().toString().trim();

        if (TextUtils.isEmpty(to) && TextUtils.isEmpty(subject) && TextUtils.isEmpty(content)) {
            Toast.makeText(this, "No content to save", Toast.LENGTH_SHORT).show();
            return;
        }

        // Create draft request
        // Need to add this to EmailAPI if not already exists
        Toast.makeText(this, "Saving draft...", Toast.LENGTH_SHORT).show();

        // For now save locally
        saveDraft();
    }

    private void setupAPI() {
        emailAPI = BackendClient.get(this).create(EmailAPI.class);

        // Get auth token
        authToken = getIntent().getStringExtra("auth_token");
        if (authToken == null) {
            SharedPreferences prefs = getSharedPreferences("user_prefs", MODE_PRIVATE);
            authToken = prefs.getString("auth_token", "");
            currentUserEmail = prefs.getString("user_email", "");
        }

        if (authToken.isEmpty()) {
            Toast.makeText(this, "Error: Token not found", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        // Add Bearer prefix if needed
        if (!authToken.startsWith("Bearer ")) {
            authToken = "Bearer " + authToken;
        }

        // Get current user email if not set
        if (TextUtils.isEmpty(currentUserEmail)) {
            SharedPreferences prefs = getSharedPreferences("user_prefs", MODE_PRIVATE);
            currentUserEmail = prefs.getString("user_email", "");
        }
    }

    private void setupBackPressHandler() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (isSending) {
                    Toast.makeText(ComposeActivity.this, "Email is being sent, please wait...", Toast.LENGTH_SHORT).show();
                    return;
                }

                if (hasUnsavedContent()) {
                    showExitConfirmationDialog();
                } else {
                    finishActivity();
                }
            }
        });
    }

    private boolean hasUnsavedContent() {
        String to = etTo.getText().toString().trim();
        String subject = etSubject.getText().toString().trim();
        String content = etContent.getText().toString().trim();

        return !TextUtils.isEmpty(to) || !TextUtils.isEmpty(subject) || !TextUtils.isEmpty(content);
    }

    private void showExitConfirmationDialog() {
        new AlertDialog.Builder(this)
                .setTitle("Save Draft")
                .setMessage("You have unsaved content. What would you like to do?")
                .setPositiveButton("Save as Draft", (dialog, which) -> {
                    saveDraft();
                    finishActivity();
                })
                .setNegativeButton("Exit without Saving", (dialog, which) -> {
                    Toast.makeText(ComposeActivity.this, "Draft not saved", Toast.LENGTH_SHORT).show();
                    finishActivity();
                })
                .setNeutralButton("Cancel", (dialog, which) -> {
                    // Stay in activity
                })
                .setCancelable(true)
                .show();
    }

    private void saveDraft() {
        // Instead of SharedPreferences, send to server
        String to = etTo.getText().toString().trim();
        String subject = etSubject.getText().toString().trim();
        String content = etContent.getText().toString().trim();

        String existingDraftId = getIntent().getStringExtra("draft_id");

        if (!TextUtils.isEmpty(existingDraftId)) {
            // This is existing draft - don't save again, just notify user
            Toast.makeText(this, "Draft already saved", Toast.LENGTH_SHORT).show();
            return;
        }

        // Create draft request
        SendEmailRequest draftRequest = new SendEmailRequest();
        draftRequest.sender = currentUserEmail;

        // If there's a recipient, add it
        if (!TextUtils.isEmpty(to)) {
            List<String> recipientsList = parseRecipients(to);
            if (!recipientsList.isEmpty()) {
                draftRequest.recipient = recipientsList.get(0);
                draftRequest.recipients = recipientsList;
            }
        }

        draftRequest.subject = subject;
        draftRequest.content = content;
        // Drafts don't need additional labels - server will add "drafts" automatically

        emailAPI.createDraft(draftRequest).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(Call<Void> call, Response<Void> response) {
                if (response.isSuccessful()) {
                    Toast.makeText(ComposeActivity.this, "Draft saved successfully", Toast.LENGTH_SHORT).show();
                    finish();
                } else {
                    Toast.makeText(ComposeActivity.this, "Error saving draft", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<Void> call, Throwable t) {
                Toast.makeText(ComposeActivity.this, "Connection error", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void finishActivity() {
        finish();
    }

    private void handleReplyData() {
        String replyTo = getIntent().getStringExtra("reply_to");
        String replySubject = getIntent().getStringExtra("reply_subject");
        String replyContent = getIntent().getStringExtra("reply_content");

        if (!TextUtils.isEmpty(replyTo)) {
            etTo.setText(replyTo);
        }

        if (!TextUtils.isEmpty(replySubject)) {
            etSubject.setText(replySubject);
        }

        if (!TextUtils.isEmpty(replyContent)) {
            etContent.setText(replyContent);
            etContent.setSelection(0);
        }

        boolean isDraft = getIntent().getBooleanExtra("is_draft", false);
        if (isDraft) {
            String draftTo = getIntent().getStringExtra("draft_to");
            String draftSubject = getIntent().getStringExtra("draft_subject");
            String draftContent = getIntent().getStringExtra("draft_content");

            if (!TextUtils.isEmpty(draftTo)) {
                etTo.setText(draftTo);
            }

            if (!TextUtils.isEmpty(draftSubject)) {
                etSubject.setText(draftSubject);
            }

            if (!TextUtils.isEmpty(draftContent)) {
                etContent.setText(draftContent);
                etContent.setSelection(0);
            }

            // Change title
            if (getSupportActionBar() != null) {
                getSupportActionBar().setTitle("Edit Draft");
            }
        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.compose_menu, menu);

        MenuItem sendItem = menu.findItem(R.id.action_send);
        sendItem.setEnabled(!isSending);

        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        int itemId = item.getItemId();

        if (itemId == android.R.id.home) {
            getOnBackPressedDispatcher().onBackPressed();
            return true;
        } else if (itemId == R.id.action_send) {
            sendDraftOrEmail(); // Change here
            return true;
        } else if (itemId == R.id.action_save_draft) {
            saveDraft();
            return true;
        } else {
            return super.onOptionsItemSelected(item);
        }
    }

    private void sendDraftOrEmail() {
        String draftId = getIntent().getStringExtra("draft_id");
        boolean isDraft = getIntent().getBooleanExtra("is_draft", false);

        if (isDraft && !TextUtils.isEmpty(draftId)) {
            updateDraftBeforeSending(draftId);
        } else {
            // Send as new email (existing function)
            sendEmail();
        }
    }

    private void updateDraftBeforeSending(String draftId) {
        if (isSending) return;

        String to = etTo.getText().toString().trim();
        String subject = etSubject.getText().toString().trim();
        String content = etContent.getText().toString().trim();

        SendEmailRequest updateRequest = new SendEmailRequest();
        updateRequest.sender = currentUserEmail;

        if (!TextUtils.isEmpty(to)) {
            List<String> recipientsList = parseRecipients(to);
            if (!recipientsList.isEmpty()) {
                updateRequest.recipient = recipientsList.get(0);
                updateRequest.recipients = recipientsList;
            }
        }

        updateRequest.subject = subject;
        updateRequest.content = content;

        isSending = true;
        invalidateOptionsMenu();

        emailAPI.updateEmail(draftId, updateRequest).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(Call<Void> call, Response<Void> response) {
                if (response.isSuccessful()) {
                    emailAPI.sendDraft(draftId).enqueue(new Callback<Void>() {
                        @Override
                        public void onResponse(Call<Void> call, Response<Void> response) {
                            isSending = false;
                            invalidateOptionsMenu();

                            if (response.isSuccessful()) {
                                Toast.makeText(ComposeActivity.this, "Draft sent successfully!", Toast.LENGTH_SHORT).show();
                                setResult(RESULT_OK);
                                finish();
                            } else {
                                Toast.makeText(ComposeActivity.this, "Error sending draft", Toast.LENGTH_SHORT).show();
                            }
                        }

                        @Override
                        public void onFailure(Call<Void> call, Throwable t) {
                            isSending = false;
                            invalidateOptionsMenu();
                            Toast.makeText(ComposeActivity.this, "Connection error", Toast.LENGTH_SHORT).show();
                        }
                    });
                } else {
                    isSending = false;
                    invalidateOptionsMenu();
                    Toast.makeText(ComposeActivity.this, "Error updating draft", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<Void> call, Throwable t) {
                isSending = false;
                invalidateOptionsMenu();
                Toast.makeText(ComposeActivity.this, "Connection error", Toast.LENGTH_SHORT).show();
            }
        });
    }
    private void sendEmail() {
        if (isSending) return;

        String to = etTo.getText().toString().trim();
        String subject = etSubject.getText().toString().trim();
        String content = etContent.getText().toString().trim();

        if (TextUtils.isEmpty(to)) {
            etTo.setError("Please enter at least one recipient address");
            etTo.requestFocus();
            return;
        }

        // Validate all recipients
        List<String> recipientsList = parseRecipients(to);
        if (recipientsList.isEmpty()) {
            etTo.setError("No valid email addresses found");
            etTo.requestFocus();
            return;
        }

        // Check that all addresses are valid
        for (String recipient : recipientsList) {
            if (!android.util.Patterns.EMAIL_ADDRESS.matcher(recipient).matches()) {
                etTo.setError("Invalid email address: " + recipient);
                etTo.requestFocus();
                return;
            }
        }

        // *** Check for missing subject/content ***
        if (shouldShowWarningDialog(subject, content)) {
            showSendWarningDialog(to, subject, content, recipientsList);
            return; // Don't continue sending
        }

        // Continue with sending
        sendEmailActual(to, subject, content, recipientsList);
    }

    // *** New functions for subject/content checking ***
    private boolean shouldShowWarningDialog(String subject, String content) {
        boolean noSubject = TextUtils.isEmpty(subject);
        boolean noContent = TextUtils.isEmpty(content);
        return noSubject || noContent;
    }

    private void showSendWarningDialog(String to, String subject, String content, List<String> recipientsList) {
        String message = getWarningMessage(subject, content);

        new AlertDialog.Builder(this)
                .setTitle("Send without " + (TextUtils.isEmpty(subject) ? "subject" : "content"))
                .setMessage(message)
                .setPositiveButton("Send Anyway", (dialog, which) -> {
                    sendEmailActual(to, subject, content, recipientsList);
                })
                .setNegativeButton("Cancel", null)
                .setCancelable(true)
                .show();
    }

    private String getWarningMessage(String subject, String content) {
        boolean noSubject = TextUtils.isEmpty(subject);
        boolean noContent = TextUtils.isEmpty(content);

        if (noSubject && noContent) {
            return "The email has no subject or content. Are you sure you want to send?";
        } else if (noSubject) {
            return "The email has no subject. Are you sure you want to send?";
        } else {
            return "The email has no content. Are you sure you want to send?";
        }
    }

    private void sendEmailActual(String to, String subject, String content, List<String> recipientsList) {
        isSending = true;
        invalidateOptionsMenu();

        SendEmailRequest request = new SendEmailRequest();
        request.sender = currentUserEmail;

        if (!recipientsList.isEmpty()) {
            request.recipient = recipientsList.get(0);
            request.recipients = recipientsList;
        }

        request.subject = subject;
        request.content = content;
        request.labels = Arrays.asList("inbox");

        System.out.println("=== DETAILED DEBUG ===");
        System.out.println("Current user email: " + currentUserEmail);
        System.out.println("Request sender: " + request.sender);
        System.out.println("Request recipient: " + request.recipient);
        System.out.println("Request subject: " + request.subject);
        System.out.println("Request content length: " + (request.content != null ? request.content.length() : 0));
        System.out.println("===================");

        emailAPI.sendEmail(request).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(Call<Void> call, Response<Void> response) {
                isSending = false;
                invalidateOptionsMenu();

                System.out.println("=== SEND EMAIL RESPONSE DEBUG ===");
                System.out.println("Response code: " + response.code());
                System.out.println("Response successful: " + response.isSuccessful());

                if (response.isSuccessful()) {
                    System.out.println("*** EMAIL SENT SUCCESSFULLY - RESPONSE CODE: " + response.code() + " ***");
                    Toast.makeText(ComposeActivity.this, "Email sent successfully!", Toast.LENGTH_SHORT).show();
                    setResult(RESULT_OK);
                    finish();
                    System.out.println("*** RETURNING TO INBOX ACTIVITY ***");
                } else {
                    System.out.println("*** EMAIL SEND FAILED - RESPONSE CODE: " + response.code() + " ***");
                    handleSendError(response.code());
                }

                System.out.println("================================");
            }

            @Override
            public void onFailure(Call<Void> call, Throwable t) {
                isSending = false;
                invalidateOptionsMenu();

                System.out.println("=== SEND EMAIL FAILURE ===");
                System.out.println("Error: " + t.getMessage());
                System.out.println("Error type: " + t.getClass().getSimpleName());
                System.out.println("==========================");

                Toast.makeText(ComposeActivity.this, "Connection error: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private List<String> parseRecipients(String to) {
        String[] recipients = to.split(",");
        return Arrays.stream(recipients)
                .map(String::trim)
                .filter(email -> !email.isEmpty())
                .collect(java.util.stream.Collectors.toList());
    }

    private void handleSendError(int responseCode) {
        switch (responseCode) {
            case 400:
                Toast.makeText(this, "Invalid data - check recipient addresses", Toast.LENGTH_SHORT).show();
                break;
            case 403:
                Toast.makeText(this, "Not authorized to send from this address", Toast.LENGTH_SHORT).show();
                break;
            case 500:
                Toast.makeText(this, "Server error - try again later", Toast.LENGTH_SHORT).show();
                break;
            default:
                Toast.makeText(this, "Failed to send email (code " + responseCode + ")", Toast.LENGTH_SHORT).show();
        }
    }
}