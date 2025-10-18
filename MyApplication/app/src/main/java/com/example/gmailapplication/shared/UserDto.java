package com.example.gmailapplication.shared;

public class UserDto {
    // Fields that match server response
    public String id;
    public String _id; // MongoDB style ID
    public String firstName;
    public String lastName;
    public String email;
    public String name; // Server returns "name" field
    public String gender;
    public String birthDate;
    public String phone;
    public String profilePicture;
    public String profileImage; // Server uses this field name

    // Default constructor
    public UserDto() {}

    // Constructor with basic fields
    public UserDto(String id, String firstName, String lastName, String email) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
    }

    // Helper method to get ID (MongoDB uses _id)
    public String getId() {
        if (id != null) return id;
        if (_id != null) return _id;
        return null;
    }

    // Helper method to get full name
    public String getFullName() {
        // First try the "name" field from server
        if (name != null && !name.trim().isEmpty()) {
            return name;
        }
        // Then build from firstName + lastName
        if (firstName != null && lastName != null) {
            return firstName + " " + lastName;
        } else if (firstName != null) {
            return firstName;
        } else if (lastName != null) {
            return lastName;
        } else if (email != null) {
            return email;
        } else {
            return "User";
        }
    }
}