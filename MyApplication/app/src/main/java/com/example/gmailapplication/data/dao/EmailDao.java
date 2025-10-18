package com.example.gmailapplication.data.dao;

import androidx.lifecycle.LiveData;
import androidx.room.*;
import com.example.gmailapplication.shared.Email;
import java.util.List;

@Dao
public interface EmailDao {
    @Query("SELECT * FROM emails")
    List<Email> getAllEmails();
    @Query("SELECT * FROM emails ORDER BY timestamp DESC")
    LiveData<List<Email>> getAllEmailsLive();

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertEmails(List<Email> emails);

    @Query("DELETE FROM emails")
    void deleteAll();
}