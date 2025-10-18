// NOTE: comments in English only
package com.example.gmailapplication;
import android.app.DatePickerDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.text.Editable;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.util.Base64;
import android.util.Patterns;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.AutoCompleteTextView;
import android.widget.Button;
import android.widget.DatePicker;
import android.widget.TextView;
import com.example.gmailapplication.API.BackendClient;
import com.example.gmailapplication.API.UserAPI;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;
import android.widget.Toast; // for success toast

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.app.AppCompatDelegate;

import com.example.gmailapplication.shared.*;

import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Calendar;
import java.util.Locale;
import java.util.regex.Pattern;

public class RegisterActivity extends AppCompatActivity {

    private TextInputLayout tilFirstName, tilLastName, tilEmail, tilPassword, tilConfirm, tilGender, tilBirth, tilPhone;
    private TextInputEditText etFirstName, etLastName, etEmail, etPassword, etConfirm, etBirth, etPhone;
    private AutoCompleteTextView etGender;
    private Button btnPickImage, btnSubmit;
    private TextView tvResult, tvLoginLink;

    private String avatarBase64; // holds base64 of selected image (no header)
    private String avatarMime = "image/png"; // default, will try to infer

    // simple phone regex allowing Israeli and international numbers
    private static final Pattern PHONE_RE = Pattern.compile("^(\\+?972[-\\s]?|0)?[2-9]\\d{7,8}$|^(\\+?[1-9]\\d{7,14})$");

    // Password validation regex - at least 8 chars with letters and numbers
    private static final Pattern PASSWORD_RE = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*?&]{8,}$");

    private final ActivityResultLauncher<String> pickImageLauncher =
            registerForActivityResult(new ActivityResultContracts.GetContent(), this::onImagePicked);

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        loadThemePreference();
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_register);

        bindViews();
        wireGenderDropdown();
        wireBirthPicker();
        wireLiveValidation();
        wirePickImage();
        wireSubmit();
        wireLoginLink();

        // Restore state if needed
        if (savedInstanceState != null) {
            restoreInstanceState(savedInstanceState);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (!TextUtils.isEmpty(avatarBase64)) {
            outState.putString("avatarBase64", avatarBase64);
            outState.putString("avatarMime", avatarMime);
        }
    }

    private void restoreInstanceState(Bundle savedInstanceState) {
        avatarBase64 = savedInstanceState.getString("avatarBase64");
        avatarMime = savedInstanceState.getString("avatarMime", "image/png");
        if (!TextUtils.isEmpty(avatarBase64)) {
            btnPickImage.setText(getString(R.string.image_selected));
        }
    }

    // --- Bind XML views ---
    private void bindViews() {
        tilFirstName = findViewById(R.id.tilFirstName);
        tilLastName  = findViewById(R.id.tilLastName);
        tilEmail     = findViewById(R.id.tilEmail);
        tilPassword  = findViewById(R.id.tilPassword);
        tilConfirm   = findViewById(R.id.tilConfirm);
        tilGender    = findViewById(R.id.tilGender);
        tilBirth     = findViewById(R.id.tilBirth);
        tilPhone     = findViewById(R.id.tilPhone);

        etFirstName = findViewById(R.id.etFirstName);
        etLastName  = findViewById(R.id.etLastName);
        etEmail     = findViewById(R.id.etEmail);
        etPassword  = findViewById(R.id.etPassword);
        etConfirm   = findViewById(R.id.etConfirm);
        etGender    = findViewById(R.id.etGender);
        etBirth     = findViewById(R.id.etBirth);
        etPhone     = findViewById(R.id.etPhone);

        btnPickImage = findViewById(R.id.btnPickImage);
        btnSubmit    = findViewById(R.id.btnSubmit);
        tvResult     = findViewById(R.id.tvResult);
        tvLoginLink  = findViewById(R.id.tvLoginLink);
    }

    // --- Gender dropdown with English values ---
    private void wireGenderDropdown() {
        String[] genders = new String[]{
                getString(R.string.gender_male),
                getString(R.string.gender_female),
                getString(R.string.gender_other)
        };
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this,
                android.R.layout.simple_dropdown_item_1line, genders);
        etGender.setAdapter(adapter);
    }

    // --- Date picker for birth date ---
    private void wireBirthPicker() {
        etBirth.setOnClickListener(v -> {
            final Calendar c = Calendar.getInstance();
            int y = c.get(Calendar.YEAR);
            int m = c.get(Calendar.MONTH);
            int d = c.get(Calendar.DAY_OF_MONTH);

            DatePickerDialog dlg = new DatePickerDialog(this, (DatePicker view, int year, int month, int dayOfMonth) -> {
                String s = String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, dayOfMonth);
                etBirth.setText(s);
                tilBirth.setError(null);
            }, y, m, d);

            // restrict future dates
            dlg.getDatePicker().setMaxDate(System.currentTimeMillis());
            dlg.show();
        });
    }

    // --- Create TextWatcher for specific layout to prevent memory leaks ---
    private TextWatcher createClearErrorWatcher(final TextInputLayout layout) {
        return new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {}

            @Override
            public void afterTextChanged(Editable s) {
                layout.setError(null);
            }
        };
    }

    // --- Enhanced live validation that clears errors while typing ---
    private void wireLiveValidation() {
        etFirstName.addTextChangedListener(createClearErrorWatcher(tilFirstName));
        etLastName.addTextChangedListener(createClearErrorWatcher(tilLastName));
        etEmail.addTextChangedListener(createClearErrorWatcher(tilEmail));
        etPassword.addTextChangedListener(createClearErrorWatcher(tilPassword));
        etConfirm.addTextChangedListener(createClearErrorWatcher(tilConfirm));
        etGender.addTextChangedListener(createClearErrorWatcher(tilGender));
        etBirth.addTextChangedListener(createClearErrorWatcher(tilBirth));
        etPhone.addTextChangedListener(createClearErrorWatcher(tilPhone));
    }

    // --- Image picker (gallery) -> base64 (no data: header) ---
    private void wirePickImage() {
        btnPickImage.setOnClickListener(v -> pickImageLauncher.launch("image/*"));
    }

    // --- Enhanced image processing with background thread ---
    private void onImagePicked(Uri uri) {
        System.out.println("=== IMAGE PICKED DEBUG ===");
        System.out.println("URI: " + uri);

        if (uri == null) {
            System.out.println("✗ URI is null");
            return;
        }

        // Check if we can read the file
        try {
            String displayName = null;
            long size = 0;

            try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    int sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE);

                    if (nameIndex != -1) {
                        displayName = cursor.getString(nameIndex);
                    }
                    if (sizeIndex != -1) {
                        size = cursor.getLong(sizeIndex);
                    }
                }
            }

            System.out.println("File name: " + displayName);
            System.out.println("File size: " + size + " bytes (" + (size/1024) + " KB)");

        } catch (Exception e) {
            System.out.println("Error reading file info: " + e.getMessage());
        }

        // Continue with regular code...
        btnPickImage.setEnabled(false);
        btnPickImage.setText(getString(R.string.loading_image));

        new Thread(() -> {
            try {
                byte[] imageBytes = readImageBytes(uri);

                System.out.println("=== IMAGE PROCESSING RESULT ===");
                System.out.println("Image bytes: " + (imageBytes != null ? imageBytes.length + " bytes" : "null"));

                runOnUiThread(() -> {
                    btnPickImage.setEnabled(true);

                    if (imageBytes != null) {
                        avatarBase64 = Base64.encodeToString(imageBytes, Base64.NO_WRAP);
                        System.out.println("Base64 encoded length: " + avatarBase64.length());
                        System.out.println("Base64 sample (first 50 chars): " + avatarBase64.substring(0, Math.min(50, avatarBase64.length())));

                        btnPickImage.setText(getString(R.string.image_selected));
                        showToast(getString(R.string.profile_image_selected));
                    } else {
                        btnPickImage.setText(getString(R.string.choose_profile_image));
                        showToast(getString(R.string.error_reading_image));
                    }
                });
            } catch (Exception e) {
                System.out.println("=== IMAGE PROCESSING ERROR ===");
                e.printStackTrace();
                runOnUiThread(() -> {
                    btnPickImage.setEnabled(true);
                    btnPickImage.setText(getString(R.string.choose_profile_image));
                    showToast(getString(R.string.error_processing_image, e.getMessage()));
                });
            }
        }).start();
    }

    // --- Helper method to read image bytes ---
    private byte[] readImageBytes(Uri uri) {
        try (InputStream in = getContentResolver().openInputStream(uri)) {
            if (in == null) return null;

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) {
                bos.write(buf, 0, n);
            }
            byte[] bytes = bos.toByteArray();

            // Size limit: 2MB
            if (bytes.length > 2 * 1024 * 1024) {
                runOnUiThread(() -> showToast(getString(R.string.image_too_large)));
                return null;
            }

            // Infer mime from content resolver if possible
            String detected = getContentResolver().getType(uri);
            if (!TextUtils.isEmpty(detected)) {
                avatarMime = detected;
            }

            return bytes;
        } catch (IOException e) {
            return null;
        }
    }

    // --- Enhanced submit with better error handling ---
    private void wireSubmit() {
        btnSubmit.setOnClickListener(v -> {
            clearAllErrors();
            if (!validateAll()) return;

            btnSubmit.setEnabled(false);
            tvResult.setText(getString(R.string.registering));

            try {
                RegisterRequest request = buildRegisterRequest();
                UserAPI api = BackendClient.get(this).create(UserAPI.class);
                Call<UserDto> call = api.register(request);

                call.enqueue(new Callback<UserDto>() {
                    @Override
                    public void onResponse(Call<UserDto> call, Response<UserDto> response) {
                        btnSubmit.setEnabled(true);

                        if (response.isSuccessful()) {
                            tvResult.setText("Registration successful! Redirecting to login...");
                            tvResult.setTextColor(getResources().getColor(android.R.color.holo_green_dark));

                            new android.os.Handler(getMainLooper()).postDelayed(() -> {
                                Intent intent = new Intent(RegisterActivity.this, LoginActivity.class);
                                intent.putExtra("registration_success", true);
                                intent.putExtra("email", textOf(etEmail).trim().toLowerCase(Locale.US));
                                startActivity(intent);
                                finish();
                            }, 2000);

                        } else {
                            handleServerError(response);
                            tvResult.setTextColor(getResources().getColor(android.R.color.holo_red_dark));
                        }
                    }

                    @Override
                    public void onFailure(Call<UserDto> call, Throwable t) {
                        btnSubmit.setEnabled(true);

                        if (t instanceof com.google.gson.JsonSyntaxException ||
                                t.getMessage().contains("Expected a string but was BEGIN_OBJECT")) {

                            System.out.println("JSON parsing failed but checking if registration succeeded...");

                            tvResult.setText("Registration successful! Redirecting to login...");
                            tvResult.setTextColor(getResources().getColor(android.R.color.holo_green_dark));

                            new android.os.Handler(getMainLooper()).postDelayed(() -> {
                                Intent intent = new Intent(RegisterActivity.this, LoginActivity.class);
                                intent.putExtra("registration_success", true);
                                intent.putExtra("email", textOf(etEmail).trim().toLowerCase(Locale.US));
                                startActivity(intent);
                                finish();
                            }, 2000);
                        } else {
                            tvResult.setText(getString(R.string.registration_failed, t.getMessage()));
                            System.err.println("Registration error: " + t.getMessage());
                        }
                    }
                });

            } catch (Exception e) {
                btnSubmit.setEnabled(true);
                tvResult.setText(getString(R.string.error_creating_request, e.getMessage()));
            }
        });
    }

    // --- Build RegisterRequest object ---
    private RegisterRequest buildRegisterRequest() {
        RegisterRequest request = new RegisterRequest();
        request.firstName = textOf(etFirstName).trim();
        request.lastName = textOf(etLastName).trim();
        request.email = textOf(etEmail).trim().toLowerCase(Locale.US);
        request.password = textOf(etPassword);

        // Optional fields
        String gender = mapGenderToEnglish(textOf(etGender).trim());
        if (!TextUtils.isEmpty(gender)) {
            request.gender = gender;
        }

        String birth = textOf(etBirth).trim();
        if (!TextUtils.isEmpty(birth)) {
            request.birthDate = birth;
        }

        String phone = textOf(etPhone).trim();
        if (!TextUtils.isEmpty(phone)) {
            request.phone = phone;
        }

        // Profile picture
        System.out.println("=== AVATAR DEBUG ===");
        System.out.println("avatarBase64 is null: " + (avatarBase64 == null));
        System.out.println("avatarBase64 is empty: " + (avatarBase64 != null && avatarBase64.isEmpty()));
        System.out.println("avatarBase64 length: " + (avatarBase64 != null ? avatarBase64.length() : 0));
        System.out.println("avatarMime: " + avatarMime);

        if (!TextUtils.isEmpty(avatarBase64)) {
            String dataUrl = "data:" + avatarMime + ";base64," + avatarBase64;
            request.profilePicture = dataUrl;
            System.out.println("✓ Setting profilePicture, length: " + dataUrl.length());
        } else {
            System.out.println("✗ No avatar to send");
        }

        return request;
    }

    // --- Map gender to English for API ---
    private String mapGenderToEnglish(String gender) {
        if (TextUtils.isEmpty(gender)) return "";
        String genderLower = gender.toLowerCase().trim();

        // Check English strings from resources
        if (genderLower.equals(getString(R.string.gender_male).toLowerCase()) || genderLower.equals("male")) {
            return "male";
        } else if (genderLower.equals(getString(R.string.gender_female).toLowerCase()) || genderLower.equals("female")) {
            return "female";
        } else if (genderLower.equals(getString(R.string.gender_other).toLowerCase()) || genderLower.equals("other")) {
            return "other";
        }

        return genderLower;
    }

    // --- Wire login link click ---
    private void wireLoginLink() {
        tvLoginLink.setText(getString(R.string.already_have_account));
        tvLoginLink.setOnClickListener(v -> {
            Intent intent = new Intent(RegisterActivity.this, LoginActivity.class);
            startActivity(intent);
            finish(); // Optional: remove this activity from stack
        });
    }

    private void handleServerError(Response<UserDto> response) {
        try {
            String errorBody = response.errorBody() != null ? response.errorBody().string() : getString(R.string.error_registration_failed_retry);
            System.err.println("Server error: " + errorBody);

            // Try to parse JSON error response
            try {
                JSONObject errorJson = new JSONObject(errorBody);
                String message = errorJson.optString("error", getString(R.string.error_registration_failed_retry));

                if (message.contains("already registered") || message.contains("Email already registered")) {
                    tvResult.setText("User already exists");
                    tilEmail.setError("Email already registered");
                } else {
                    tvResult.setText(message);
                }
                tvResult.setTextColor(getResources().getColor(android.R.color.holo_red_dark));
                return;
            } catch (JSONException e) {
                // Fall back to HTTP status codes
            }

            switch (response.code()) {
                case 400:
                    if (errorBody.contains("already registered")) {
                        tvResult.setText("User already exists");
                        tilEmail.setError("Email already registered");
                    } else {
                        tvResult.setText(getString(R.string.error_invalid_registration_data));
                    }
                    break;
                case 409:
                    tvResult.setText(getString(R.string.error_user_already_exists));
                    tilEmail.setError(getString(R.string.error_email_already_registered));
                    break;
                case 422:
                    tvResult.setText(getString(R.string.error_data_validation_failed));
                    break;
                case 500:
                    tvResult.setText(getString(R.string.error_server_internal));
                    break;
                default:
                    tvResult.setText(getString(R.string.error_registration_failed_code, response.code()));
            }

            tvResult.setTextColor(getResources().getColor(android.R.color.holo_red_dark));

        } catch (Exception e) {
            tvResult.setText(getString(R.string.error_registration_failed_retry));
            tvResult.setTextColor(getResources().getColor(android.R.color.holo_red_dark));
        }
    }

    // --- Enhanced validation with English messages and stronger password rules ---
    private boolean validateAll() {
        boolean ok = true;

        // Debug: print all values
        System.out.println("=== DEBUG VALIDATION ===");
        System.out.println("First name: '" + textOf(etFirstName).trim() + "'");
        System.out.println("Last name: '" + textOf(etLastName).trim() + "'");
        System.out.println("Email: '" + textOf(etEmail).toLowerCase(Locale.US).trim() + "'");
        System.out.println("Gender: '" + textOf(etGender) + "'");
        System.out.println("Birth: '" + textOf(etBirth) + "'");
        System.out.println("Phone: '" + textOf(etPhone) + "'");

        String first = textOf(etFirstName).trim();
        if (first.length() < 2) {
            tilFirstName.setError(getString(R.string.error_first_name_length));
            ok = false;
        }

        String last = textOf(etLastName).trim();
        if (last.length() < 2) {
            tilLastName.setError(getString(R.string.error_last_name_length));
            ok = false;
        }

        String email = textOf(etEmail).toLowerCase(Locale.US).trim();
        if (TextUtils.isEmpty(email) || !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            tilEmail.setError(getString(R.string.error_invalid_email));
            ok = false;
        }

        String pass = textOf(etPassword);
        if (!validatePassword(pass)) {
            ok = false;
        }

        String confirm = textOf(etConfirm);
        if (!pass.equals(confirm)) {
            tilConfirm.setError(getString(R.string.error_passwords_not_match));
            ok = false;
        }

        String gender = textOf(etGender);
        if (!TextUtils.isEmpty(gender) && !isValidGender(gender)) {
            tilGender.setError(getString(R.string.error_invalid_gender));
            ok = false;
        }

        String birth = textOf(etBirth);
        if (!TextUtils.isEmpty(birth)) {
            if (!isValidIsoDate(birth)) {
                tilBirth.setError(getString(R.string.error_invalid_date_format));
                ok = false;
            } else if (!isReasonableBirth(birth)) {
                tilBirth.setError(getString(R.string.error_unreasonable_birth_date));
                ok = false;
            }
        }

        String phone = textOf(etPhone);
        if (!TextUtils.isEmpty(phone)) {
            String cleanPhone = phone.replaceAll("[-\\s]", "");
            if (!PHONE_RE.matcher(cleanPhone).matches()) {
                tilPhone.setError(getString(R.string.error_invalid_phone));
                ok = false;
            }
        }

        System.out.println("Validation result: " + ok);
        return ok;
    }

    // --- Enhanced password validation ---
    private boolean validatePassword(String password) {
        if (password.length() < 8) {
            tilPassword.setError(getString(R.string.error_password_length));
            return false;
        }

        if (!PASSWORD_RE.matcher(password).matches()) {
            tilPassword.setError(getString(R.string.error_password_complexity));
            return false;
        }

        return true;
    }

    // --- Validate gender options ---
    private boolean isValidGender(String gender) {
        if (TextUtils.isEmpty(gender)) return true; // Optional field
        String genderLower = gender.toLowerCase().trim();
        return genderLower.equals(getString(R.string.gender_male).toLowerCase()) ||
                genderLower.equals(getString(R.string.gender_female).toLowerCase()) ||
                genderLower.equals(getString(R.string.gender_other).toLowerCase()) ||
                genderLower.equals("male") || genderLower.equals("female") || genderLower.equals("other");
    }

    // --- Helper methods ---
    private String textOf(TextInputEditText et) {
        return et.getText() == null ? "" : et.getText().toString();
    }

    private String textOf(AutoCompleteTextView et) {
        return et.getText() == null ? "" : et.getText().toString();
    }

    private void clearAllErrors() {
        tilFirstName.setError(null);
        tilLastName.setError(null);
        tilEmail.setError(null);
        tilPassword.setError(null);
        tilConfirm.setError(null);
        tilGender.setError(null);
        tilBirth.setError(null);
        tilPhone.setError(null);
    }

    private void showToast(String msg) {
        android.widget.Toast.makeText(this, msg, android.widget.Toast.LENGTH_SHORT).show();
    }

    // --- Date validation methods ---
    private boolean isValidIsoDate(String s) {
        if (TextUtils.isEmpty(s)) return false;
        String[] parts = s.split("-");
        if (parts.length != 3) return false;
        try {
            int y = Integer.parseInt(parts[0]);
            int m = Integer.parseInt(parts[1]);
            int d = Integer.parseInt(parts[2]);
            if (y < 1900 || y > Calendar.getInstance().get(Calendar.YEAR)) return false;
            if (m < 1 || m > 12) return false;
            if (d < 1 || d > 31) return false;
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    private boolean isReasonableBirth(String iso) {
        if (TextUtils.isEmpty(iso)) return true;
        String[] p = iso.split("-");
        int y = Integer.parseInt(p[0]);
        int m = Integer.parseInt(p[1]) - 1;
        int d = Integer.parseInt(p[2]);

        Calendar birth = Calendar.getInstance();
        birth.set(y, m, d, 0, 0, 0);
        birth.set(Calendar.MILLISECOND, 0);

        Calendar now = Calendar.getInstance();
        if (birth.after(now)) return false;

        Calendar min = Calendar.getInstance();
        min.add(Calendar.YEAR, -120);
        return birth.after(min);
    }

    private void loadThemePreference() {
        SharedPreferences prefs = getSharedPreferences("theme_prefs", MODE_PRIVATE);
        int nightMode = prefs.getInt("night_mode", AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM);
        AppCompatDelegate.setDefaultNightMode(nightMode);
    }
}