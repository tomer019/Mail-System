package com.example.gmailapplication;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.widget.Button;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.lifecycle.ViewModelProvider;

import com.example.gmailapplication.viewmodels.LoginViewModel;
import com.example.gmailapplication.shared.LoginResponse;
import com.example.gmailapplication.shared.UserDto;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;

public class LoginActivity extends AppCompatActivity {

    private TextInputLayout tilEmail, tilPassword;
    private TextInputEditText etEmail, etPassword;
    private Button btnLogin;
    private TextView tvResult, tvRegisterLink;

    private LoginViewModel viewModel;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        loadThemePreference();
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        // Initialize ViewModel
        viewModel = new ViewModelProvider(this).get(LoginViewModel.class);

        bindViews();
        wireTextFields();
        wireButtons();
        wireLinks();
        observeViewModel();
        handleIntentData();
    }

    // --- Bind XML views ---
    private void bindViews() {
        tilEmail = findViewById(R.id.tilEmail);
        tilPassword = findViewById(R.id.tilPassword);

        etEmail = findViewById(R.id.etEmail);
        etPassword = findViewById(R.id.etPassword);

        btnLogin = findViewById(R.id.btnLogin);
        tvResult = findViewById(R.id.tvResult);
        tvRegisterLink = findViewById(R.id.tvRegisterLink);
    }

    // --- Wire text fields to ViewModel ---
    private void wireTextFields() {
        // Email
        etEmail.addTextChangedListener(new SimpleTextWatcher() {
            @Override
            public void afterTextChanged(Editable s) {
                viewModel.setEmail(s.toString());
            }
        });

        // Password
        etPassword.addTextChangedListener(new SimpleTextWatcher() {
            @Override
            public void afterTextChanged(Editable s) {
                viewModel.setPassword(s.toString());
            }
        });
    }

    // --- Wire buttons ---
    private void wireButtons() {
        btnLogin.setOnClickListener(v -> viewModel.login());
    }

    // --- Wire links ---
    private void wireLinks() {
        // Register link
        tvRegisterLink.setText(getString(R.string.no_account_register));
        tvRegisterLink.setOnClickListener(v -> {
            Intent intent = new Intent(LoginActivity.this, RegisterActivity.class);
            startActivity(intent);
        });
    }

    // --- Handle intent data from registration ---
    private void handleIntentData() {
        Intent intent = getIntent();

        // Check if coming from successful registration
        if (intent.getBooleanExtra("registration_success", false)) {
            String email = intent.getStringExtra("email");
            if (!TextUtils.isEmpty(email)) {
                viewModel.prefillEmail(email);
                etEmail.setText(email);
            }
            showToast(getString(R.string.registration_completed));
        }
    }

    // --- Observe ViewModel ---
    private void observeViewModel() {
        // Loading state
        viewModel.getIsLoading().observe(this, isLoading -> {
            btnLogin.setEnabled(!isLoading);
            if (isLoading) {
                tvResult.setText(getString(R.string.logging_in));
            }
        });

        // Error messages for fields
        viewModel.getEmailError().observe(this, error ->
                tilEmail.setError(TextUtils.isEmpty(error) ? null : error));

        viewModel.getPasswordError().observe(this, error ->
                tilPassword.setError(TextUtils.isEmpty(error) ? null : error));

        // General messages
        viewModel.getErrorMessage().observe(this, error -> {
            if (!TextUtils.isEmpty(error)) {
                tvResult.setText(error);
                tvResult.setTextColor(getResources().getColor(android.R.color.holo_red_dark));
            }
        });

        viewModel.getSuccessMessage().observe(this, success -> {
            if (!TextUtils.isEmpty(success)) {
                tvResult.setText(success);
                tvResult.setTextColor(getResources().getColor(android.R.color.holo_green_dark));
            }
        });

        // Login success - navigate to inbox
        viewModel.getLoginResult().observe(this, loginResponse -> {
            if (loginResponse != null && loginResponse.token != null) {
                // Get user from currentUser LiveData
                UserDto user = viewModel.getCurrentUser().getValue();
                if (user != null) {
                    // Save login data
                    saveLoginData(loginResponse, user);

                    // Show success message briefly then navigate to inbox
                    showToast(getString(R.string.login_successful));

                    // Navigate to inbox activity after a short delay
                    new android.os.Handler(getMainLooper()).postDelayed(() -> {
                        Intent intent = new Intent(LoginActivity.this, InboxActivity.class);
                        intent.putExtra("user_id", user.getId());
                        intent.putExtra("user_name", user.getFullName());
                        intent.putExtra("user_email", user.email);
                        intent.putExtra("auth_token", loginResponse.token);

                        startActivity(intent);
                        finish();
                    }, 1500);
                }
            }
        });

        // Restore form data (survives configuration changes)
        viewModel.getEmail().observe(this, value -> {
            if (!etEmail.getText().toString().equals(value)) {
                etEmail.setText(value);
            }
        });

        viewModel.getPassword().observe(this, value -> {
            if (!etPassword.getText().toString().equals(value)) {
                etPassword.setText(value);
            }
        });
    }

    // --- Save login data for future use ---
    private void saveLoginData(LoginResponse loginResponse, UserDto user) {
        SharedPreferences prefs = getSharedPreferences("user_prefs", MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        editor.putString("auth_token", loginResponse.token);
        editor.putLong("token_expires_at", System.currentTimeMillis() + (loginResponse.expiresIn * 1000));
        editor.putString("user_id", user.getId());
        editor.putString("user_email", user.email);
        editor.putString("user_name", user.getFullName());
        editor.putBoolean("is_logged_in", true);

        editor.apply();

        // ALSO save to TokenManager for BackendClient
        com.example.gmailapplication.shared.TokenManager.save(this, loginResponse.token);
    }

    // --- Check if user is already logged in ---
    public static boolean isUserLoggedIn(android.content.Context context) {
        android.content.SharedPreferences prefs = context.getSharedPreferences("user_prefs", MODE_PRIVATE);
        boolean isLoggedIn = prefs.getBoolean("is_logged_in", false);
        long expiresAt = prefs.getLong("token_expires_at", 0);

        // Check if token is still valid
        return isLoggedIn && System.currentTimeMillis() < expiresAt;
    }

    // --- Clear login data (for logout) ---
    public static void clearLoginData(android.content.Context context) {
        android.content.SharedPreferences prefs = context.getSharedPreferences("user_prefs", MODE_PRIVATE);
        prefs.edit().clear().apply();
    }

    // --- Helper classes ---
    private abstract static class SimpleTextWatcher implements TextWatcher {
        @Override
        public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

        @Override
        public void onTextChanged(CharSequence s, int start, int before, int count) {}

        @Override
        public abstract void afterTextChanged(Editable s);
    }

    private void showToast(String msg) {
        android.widget.Toast.makeText(this, msg, android.widget.Toast.LENGTH_SHORT).show();
    }

    private void loadThemePreference() {
        SharedPreferences prefs = getSharedPreferences("theme_prefs", MODE_PRIVATE);
        int nightMode = prefs.getInt("night_mode", AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM);
        AppCompatDelegate.setDefaultNightMode(nightMode);
    }
}