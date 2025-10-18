package com.example.gmailapplication;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.app.AppCompatDelegate;

public class MainActivity extends AppCompatActivity {

    private TextView tvAppName, tvLoading;
    private Handler handler = new Handler();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        loadThemePreference();
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        bindViews();
        showSplashScreen();
    }

    private void bindViews() {
        tvAppName = findViewById(R.id.tvAppName);
        tvLoading = findViewById(R.id.tvLoading);

        // Set app name and loading text using string resources
        tvAppName.setText(getString(R.string.app_name));
        tvLoading.setText(getString(R.string.loading));
    }

    private void showSplashScreen() {
        // Show splash for 2 seconds, then check authentication
        handler.postDelayed(() -> {
            checkAuthenticationAndNavigate();
        }, 2000);
    }

    private void checkAuthenticationAndNavigate() {
        if (LoginActivity.isUserLoggedIn(this)) {
            // User is already logged in, go to inbox
            SharedPreferences prefs = getSharedPreferences("user_prefs", MODE_PRIVATE);
            String userId = prefs.getString("user_id", "");
            String userName = prefs.getString("user_name", "");
            String userEmail = prefs.getString("user_email", "");
            String authToken = prefs.getString("auth_token", "");

            Intent intent = new Intent(MainActivity.this, InboxActivity.class);
            intent.putExtra("user_id", userId);
            intent.putExtra("user_name", userName);
            intent.putExtra("user_email", userEmail);
            intent.putExtra("auth_token", authToken);
            intent.putExtra("auto_login", true);

            startActivity(intent);
            finish();
        } else {
            // User not logged in, go to login
            Intent intent = new Intent(MainActivity.this, LoginActivity.class);
            startActivity(intent);
            finish();
        }
    }

    private void loadThemePreference() {
        SharedPreferences prefs = getSharedPreferences("theme_prefs", MODE_PRIVATE);
        int nightMode = prefs.getInt("night_mode", AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM);
        AppCompatDelegate.setDefaultNightMode(nightMode);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (handler != null) {
            handler.removeCallbacksAndMessages(null);
        }
    }
}