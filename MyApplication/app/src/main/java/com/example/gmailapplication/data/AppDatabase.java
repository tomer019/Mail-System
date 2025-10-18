package com.example.gmailapplication.data;

import androidx.room.Database;
import androidx.room.Room;
import androidx.room.RoomDatabase;
import android.content.Context;

import com.example.gmailapplication.data.dao.UserDao;
import com.example.gmailapplication.shared.Email;
import com.example.gmailapplication.shared.Label;
import com.example.gmailapplication.data.dao.EmailDao;
import com.example.gmailapplication.data.dao.LabelDao;
import com.example.gmailapplication.shared.User;

@Database(entities = {Email.class, Label.class, User.class}, version = 2)
public abstract class AppDatabase extends RoomDatabase {
    public abstract EmailDao emailDao();
    public abstract LabelDao labelDao();
    public abstract UserDao userDao();

    private static AppDatabase INSTANCE;

    public static AppDatabase getInstance(Context context) {
        if (INSTANCE == null) {
            synchronized (AppDatabase.class) {
                if (INSTANCE == null) {
                    INSTANCE = Room.databaseBuilder(context.getApplicationContext(),
                                    AppDatabase.class, "gmail_database")
                            .fallbackToDestructiveMigration()
                            .build();
                }
            }
        }
        return INSTANCE;
    }
}