package com.example.gmailapplication.shared;

public class UserInfo {
    public String email;
    public String firstName;
    public String lastName;
    public String profileImage;

    public UserInfo() {}

    public String getDisplayName() {
        if (firstName != null && lastName != null) {
            return firstName + " " + lastName;
        } else if (firstName != null) {
            return firstName;
        } else if (email != null) {
            return email;
        }
        return "Unknown";
    }
}