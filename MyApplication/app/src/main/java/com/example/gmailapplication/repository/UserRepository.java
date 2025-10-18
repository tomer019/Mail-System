package com.example.gmailapplication.repository;

import android.content.Context;
import androidx.lifecycle.LiveData;
import com.example.gmailapplication.API.BackendClient;
import com.example.gmailapplication.API.UserAPI;
import com.example.gmailapplication.data.AppDatabase;
import com.example.gmailapplication.data.dao.UserDao;
import com.example.gmailapplication.shared.*;
import retrofit2.Call;

public class UserRepository {
    private UserAPI api;
    private UserDao userDao; // Add this

    public UserRepository(Context context) {
        this.api = BackendClient.get(context).create(UserAPI.class);
        this.userDao = AppDatabase.getInstance(context).userDao();
        System.out.println("UserRepository: initialized with Room");
    }

    public Call<UserDto> register(RegisterRequest request) {
        return api.register(request);
    }

    public Call<LoginResponse> login(LoginRequest request) {
        return api.login(request);
    }

    public Call<UserDto> getCurrentUser(String authToken) {
        return api.getCurrentUser(authToken);
    }

    public void saveUserToRoom(UserDto userDto) {
        new Thread(() -> {
            User user = new User(userDto);
            userDao.insertUser(user);
            System.out.println("UserRepository: User saved to Room");
        }).start();
    }

    public LiveData<User> getUserByEmail(String email) {
        return userDao.getUserByEmail(email);
    }
}