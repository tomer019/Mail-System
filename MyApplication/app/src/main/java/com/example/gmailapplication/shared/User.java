package com.example.gmailapplication.shared;

import androidx.room.Entity;
import androidx.room.PrimaryKey;
import androidx.annotation.NonNull;

@Entity(tableName = "users")
public class User {
    @PrimaryKey
    @NonNull
    public String id;

    public String firstName;
    public String lastName;
    public String email;
    public String name;
    public String gender;
    public String birthDate;
    public String phone;
    public String profilePicture;

    public User() {}

    public User(UserDto userDto) {
        this.id = userDto.getId() != null ? userDto.getId() : "unknown";
        this.firstName = userDto.firstName;
        this.lastName = userDto.lastName;
        this.email = userDto.email;
        this.name = userDto.name;
        this.gender = userDto.gender;
        this.birthDate = userDto.birthDate;
        this.phone = userDto.phone;
        this.profilePicture = userDto.profilePicture;
    }

    public UserDto toUserDto() {
        UserDto dto = new UserDto();
        dto.id = this.id;
        dto.firstName = this.firstName;
        dto.lastName = this.lastName;
        dto.email = this.email;
        dto.name = this.name;
        dto.gender = this.gender;
        dto.birthDate = this.birthDate;
        dto.phone = this.phone;
        dto.profilePicture = this.profilePicture;
        return dto;
    }
}