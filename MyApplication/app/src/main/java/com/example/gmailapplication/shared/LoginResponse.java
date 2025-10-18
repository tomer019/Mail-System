package com.example.gmailapplication.shared;

public class LoginResponse {
    public UserDto user;
    public String token;
    public String refreshToken;
    public long expiresIn; // in seconds
    public String message;
    public boolean success;

    // Alternative field names that some servers might use
    public String accessToken;
    public String authToken;
    public UserDto data;

    public LoginResponse() {}

    public LoginResponse(UserDto user, String token, String refreshToken, long expiresIn) {
        this.user = user;
        this.token = token;
        this.refreshToken = refreshToken;
        this.expiresIn = expiresIn;
        this.success = true;
    }

    // Helper method to get token from various possible field names
    public String getToken() {
        if (token != null) return token;
        if (accessToken != null) return accessToken;
        if (authToken != null) return authToken;
        return null;
    }

    // Helper method to get user from various possible field names
    public UserDto getUser() {
        if (user != null) return user;
        if (data != null) return data;
        return null;
    }
}