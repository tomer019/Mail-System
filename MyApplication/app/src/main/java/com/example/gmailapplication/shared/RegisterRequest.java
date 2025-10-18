package com.example.gmailapplication.shared;
// NOTE: comments in English only
public class RegisterRequest {
    public String firstName;
    public String lastName;
    public String password;
    public String email;
    public String birthDate;   // optional, follow your server format
    public String phone;       // optional
    public String gender;      // optional
    public String profilePicture; // optional, matches your controller field
}

