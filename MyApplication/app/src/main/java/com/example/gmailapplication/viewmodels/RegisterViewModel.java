package com.example.gmailapplication.viewmodels;

import android.app.Application;
import android.text.TextUtils;
import android.util.Patterns;
import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.example.gmailapplication.API.BackendClient;
import com.example.gmailapplication.API.UserAPI;
import com.example.gmailapplication.shared.RegisterRequest;
import com.example.gmailapplication.shared.UserDto;

import java.util.Locale;
import java.util.regex.Pattern;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class RegisterViewModel extends AndroidViewModel {

    // API client
    private UserAPI userAPI;

    // Form data - survives configuration changes
    private MutableLiveData<String> firstName = new MutableLiveData<>("");
    private MutableLiveData<String> lastName = new MutableLiveData<>("");
    private MutableLiveData<String> email = new MutableLiveData<>("");
    private MutableLiveData<String> password = new MutableLiveData<>("");
    private MutableLiveData<String> confirmPassword = new MutableLiveData<>("");
    private MutableLiveData<String> gender = new MutableLiveData<>("");
    private MutableLiveData<String> birthDate = new MutableLiveData<>("");
    private MutableLiveData<String> phone = new MutableLiveData<>("");
    private MutableLiveData<String> avatarBase64 = new MutableLiveData<>("");
    private MutableLiveData<String> avatarMime = new MutableLiveData<>("image/png");

    // UI State
    private MutableLiveData<Boolean> isLoading = new MutableLiveData<>(false);
    private MutableLiveData<String> errorMessage = new MutableLiveData<>("");
    private MutableLiveData<String> successMessage = new MutableLiveData<>("");

    // Validation errors
    private MutableLiveData<String> firstNameError = new MutableLiveData<>("");
    private MutableLiveData<String> lastNameError = new MutableLiveData<>("");
    private MutableLiveData<String> emailError = new MutableLiveData<>("");
    private MutableLiveData<String> passwordError = new MutableLiveData<>("");
    private MutableLiveData<String> confirmPasswordError = new MutableLiveData<>("");
    private MutableLiveData<String> genderError = new MutableLiveData<>("");
    private MutableLiveData<String> birthDateError = new MutableLiveData<>("");
    private MutableLiveData<String> phoneError = new MutableLiveData<>("");

    // Registration result
    private MutableLiveData<UserDto> registeredUser = new MutableLiveData<>();

    // Validation patterns
    private static final Pattern PHONE_RE = Pattern.compile("^(\\+?[1-9]\\d{7,14}|0\\d{8,10})$");
    private static final Pattern PASSWORD_RE = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*?&]{8,}$");

    public RegisterViewModel(@NonNull Application application) {
        super(application);
        userAPI = BackendClient.get(application).create(UserAPI.class);
    }

    // --- Getters for LiveData (read-only) ---
    public LiveData<String> getFirstName() { return firstName; }
    public LiveData<String> getLastName() { return lastName; }
    public LiveData<String> getEmail() { return email; }
    public LiveData<String> getPassword() { return password; }
    public LiveData<String> getConfirmPassword() { return confirmPassword; }
    public LiveData<String> getGender() { return gender; }
    public LiveData<String> getBirthDate() { return birthDate; }
    public LiveData<String> getPhone() { return phone; }
    public LiveData<String> getAvatarBase64() { return avatarBase64; }
    public LiveData<String> getAvatarMime() { return avatarMime; }

    public LiveData<Boolean> getIsLoading() { return isLoading; }
    public LiveData<String> getErrorMessage() { return errorMessage; }
    public LiveData<String> getSuccessMessage() { return successMessage; }

    public LiveData<String> getFirstNameError() { return firstNameError; }
    public LiveData<String> getLastNameError() { return lastNameError; }
    public LiveData<String> getEmailError() { return emailError; }
    public LiveData<String> getPasswordError() { return passwordError; }
    public LiveData<String> getConfirmPasswordError() { return confirmPasswordError; }
    public LiveData<String> getGenderError() { return genderError; }
    public LiveData<String> getBirthDateError() { return birthDateError; }
    public LiveData<String> getPhoneError() { return phoneError; }

    public LiveData<UserDto> getRegisteredUser() { return registeredUser; }

    // --- Setters for form data ---
    public void setFirstName(String value) {
        firstName.setValue(value);
        if (!TextUtils.isEmpty(value)) {
            firstNameError.setValue(""); // Clear error when user types
        }
    }

    public void setLastName(String value) {
        lastName.setValue(value);
        if (!TextUtils.isEmpty(value)) {
            lastNameError.setValue("");
        }
    }

    public void setEmail(String value) {
        email.setValue(value);
        if (!TextUtils.isEmpty(value)) {
            emailError.setValue("");
        }
    }

    public void setPassword(String value) {
        password.setValue(value);
        if (!TextUtils.isEmpty(value)) {
            passwordError.setValue("");
        }
    }

    public void setConfirmPassword(String value) {
        confirmPassword.setValue(value);
        if (!TextUtils.isEmpty(value)) {
            confirmPasswordError.setValue("");
        }
    }

    public void setGender(String value) {
        gender.setValue(value);
        if (!TextUtils.isEmpty(value)) {
            genderError.setValue("");
        }
    }

    public void setBirthDate(String value) {
        birthDate.setValue(value);
        if (!TextUtils.isEmpty(value)) {
            birthDateError.setValue("");
        }
    }

    public void setPhone(String value) {
        phone.setValue(value);
        if (!TextUtils.isEmpty(value)) {
            phoneError.setValue("");
        }
    }

    public void setAvatar(String base64, String mimeType) {
        avatarBase64.setValue(base64);
        avatarMime.setValue(mimeType);
    }

    // --- Clear all errors ---
    public void clearAllErrors() {
        firstNameError.setValue("");
        lastNameError.setValue("");
        emailError.setValue("");
        passwordError.setValue("");
        confirmPasswordError.setValue("");
        genderError.setValue("");
        birthDateError.setValue("");
        phoneError.setValue("");
        errorMessage.setValue("");
    }

    // --- Validation methods ---
    public boolean validateAll() {
        boolean isValid = true;
        clearAllErrors();

        // First name validation
        String firstNameVal = firstName.getValue();
        if (TextUtils.isEmpty(firstNameVal) || firstNameVal.trim().length() < 2) {
            firstNameError.setValue("First name must contain at least 2 characters");
            isValid = false;
        }

        // Last name validation
        String lastNameVal = lastName.getValue();
        if (TextUtils.isEmpty(lastNameVal) || lastNameVal.trim().length() < 2) {
            lastNameError.setValue("Last name must contain at least 2 characters");
            isValid = false;
        }

        // Email validation
        String emailVal = email.getValue();
        if (TextUtils.isEmpty(emailVal) || !Patterns.EMAIL_ADDRESS.matcher(emailVal.trim()).matches()) {
            emailError.setValue("Invalid email address");
            isValid = false;
        }

        // Password validation
        String passwordVal = password.getValue();
        if (TextUtils.isEmpty(passwordVal) || passwordVal.length() < 8) {
            passwordError.setValue("Password must contain at least 8 characters");
            isValid = false;
        } else if (!PASSWORD_RE.matcher(passwordVal).matches()) {
            passwordError.setValue("Password must contain a combination of letters and numbers");
            isValid = false;
        }

        // Confirm password validation
        String confirmPasswordVal = confirmPassword.getValue();
        if (!passwordVal.equals(confirmPasswordVal)) {
            confirmPasswordError.setValue("Passwords do not match");
            isValid = false;
        }

        // Gender validation (optional)
        String genderVal = gender.getValue();
        if (!TextUtils.isEmpty(genderVal) && !isValidGender(genderVal)) {
            genderError.setValue("Please select a valid gender");
            isValid = false;
        }

        // Birth date validation (optional)
        String birthDateVal = birthDate.getValue();
        if (!TextUtils.isEmpty(birthDateVal) && !isValidBirthDate(birthDateVal)) {
            birthDateError.setValue("Invalid birth date");
            isValid = false;
        }

        // Phone validation (optional)
        String phoneVal = phone.getValue();
        if (!TextUtils.isEmpty(phoneVal) && !PHONE_RE.matcher(phoneVal.trim()).matches()) {
            phoneError.setValue("Invalid phone number");
            isValid = false;
        }

        return isValid;
    }

    // --- Register method ---
    public void register() {
        if (!validateAll()) {
            return;
        }

        isLoading.setValue(true);
        errorMessage.setValue("");
        successMessage.setValue("");

        RegisterRequest request = buildRegisterRequest();

        userAPI.register(request).enqueue(new Callback<UserDto>() {
            @Override
            public void onResponse(Call<UserDto> call, Response<UserDto> response) {
                isLoading.setValue(false);

                if (response.isSuccessful()) {
                    UserDto user = response.body();
                    registeredUser.setValue(user);
                    successMessage.setValue("Registration completed successfully! Redirecting to login page...");
                } else {
                    handleServerError(response);
                }
            }

            @Override
            public void onFailure(Call<UserDto> call, Throwable t) {
                isLoading.setValue(false);
                errorMessage.setValue("Registration failed: " + t.getMessage());
            }
        });
    }

    // --- Build register request ---
    private RegisterRequest buildRegisterRequest() {
        RegisterRequest request = new RegisterRequest();
        request.firstName = firstName.getValue().trim();
        request.lastName = lastName.getValue().trim();
        request.email = email.getValue().trim().toLowerCase(Locale.US);
        request.password = password.getValue();

        // Optional fields
        String genderVal = mapGenderToEnglish(gender.getValue());
        if (!TextUtils.isEmpty(genderVal)) {
            request.gender = genderVal;
        }

        String birthDateVal = birthDate.getValue();
        if (!TextUtils.isEmpty(birthDateVal)) {
            request.birthDate = birthDateVal.trim();
        }

        String phoneVal = phone.getValue();
        if (!TextUtils.isEmpty(phoneVal)) {
            request.phone = phoneVal.trim();
        }

        // Profile picture
        String avatarVal = avatarBase64.getValue();
        if (!TextUtils.isEmpty(avatarVal)) {
            String dataUrl = "data:" + avatarMime.getValue() + ";base64," + avatarVal;
            request.profilePicture = dataUrl;
        }

        return request;
    }

    // --- Server error handling ---
    private void handleServerError(Response<UserDto> response) {
        try {
            String errorBody = response.errorBody() != null ? response.errorBody().string() : "Unknown error";

            switch (response.code()) {
                case 400:
                    errorMessage.setValue("Invalid registration data");
                    break;
                case 409:
                    errorMessage.setValue("This user already exists in the system");
                    emailError.setValue("This email address is already registered in the system");
                    break;
                case 422:
                    errorMessage.setValue("Data validation failed");
                    break;
                case 500:
                    errorMessage.setValue("Internal server error - please try again later");
                    break;
                default:
                    errorMessage.setValue("Registration failed (error " + response.code() + ")");
            }
        } catch (Exception e) {
            errorMessage.setValue("Registration failed - please try again");
        }
    }

    // --- Helper methods ---
    private String mapGenderToEnglish(String hebrewGender) {
        if (TextUtils.isEmpty(hebrewGender)) return "";
        switch (hebrewGender.trim()) {
            case "Male": return "male";
            case "Female": return "female";
            case "Other": return "other";
            default: return hebrewGender.toLowerCase(Locale.US);
        }
    }

    private boolean isValidGender(String gender) {
        if (TextUtils.isEmpty(gender)) return true;
        String trimmed = gender.trim();
        return trimmed.equals("Male") || trimmed.equals("Female") || trimmed.equals("Other");
    }

    private boolean isValidBirthDate(String dateStr) {
        if (TextUtils.isEmpty(dateStr)) return true;
        // Simple validation - you can enhance this
        String[] parts = dateStr.split("-");
        if (parts.length != 3) return false;
        try {
            int year = Integer.parseInt(parts[0]);
            int month = Integer.parseInt(parts[1]);
            int day = Integer.parseInt(parts[2]);
            return year >= 1900 && year <= 2024 && month >= 1 && month <= 12 && day >= 1 && day <= 31;
        } catch (NumberFormatException e) {
            return false;
        }
    }
}