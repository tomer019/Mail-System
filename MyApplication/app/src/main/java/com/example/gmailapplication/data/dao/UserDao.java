package com.example.gmailapplication.data.dao;

import androidx.lifecycle.LiveData;
import androidx.room.*;
import com.example.gmailapplication.shared.User;
import java.util.List;

@Dao
public interface UserDao {
    @Query("SELECT * FROM users")
    List<User> getAllUsers();

    @Query("SELECT * FROM users ORDER BY id DESC")
    LiveData<List<User>> getAllUsersLive();

    @Query("SELECT * FROM users WHERE id = :userId LIMIT 1")
    User getUserById(String userId);

    @Query("SELECT * FROM users WHERE email = :email LIMIT 1")
    LiveData<User> getUserByEmail(String email);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertUser(User user);

    @Update
    void updateUser(User user);

    @Query("DELETE FROM users")
    void deleteAll();
}