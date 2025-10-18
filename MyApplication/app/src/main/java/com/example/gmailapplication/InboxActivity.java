package com.example.gmailapplication;

import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;
import android.view.SubMenu;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.core.view.GravityCompat;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.gmailapplication.API.BackendClient;
import com.example.gmailapplication.API.LabelAPI;
import com.example.gmailapplication.API.UserAPI;
import com.example.gmailapplication.adapters.EmailAdapter;
import com.example.gmailapplication.shared.CreateLabelRequest;
import com.example.gmailapplication.shared.Email;
import com.example.gmailapplication.shared.Label;
import com.example.gmailapplication.shared.TokenManager;
import com.example.gmailapplication.shared.UpdateLabelRequest;
import com.example.gmailapplication.viewmodels.InboxViewModel;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.google.android.material.navigation.NavigationView;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import okhttp3.ResponseBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class InboxActivity extends AppCompatActivity implements NavigationView.OnNavigationItemSelectedListener {

    private RecyclerView recyclerView;
    private EmailAdapter adapter;
    private InboxViewModel viewModel;

    // Navigation Drawer components
    private DrawerLayout drawerLayout;
    private NavigationView navigationView;

    // Current filter state
    private String currentFilter = "inbox";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        loadThemePreference();
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_inbox);
        System.out.println("=== INBOX ACTIVITY STARTED ===");

        // Init views
        initViews();

        // Init ViewModel
        viewModel = new ViewModelProvider(this).get(InboxViewModel.class);

        setupRecyclerView();
        setupObservers();
        setupNavigationDrawer();
        setupHeader();
        setupPaginationControls();

        // Load emails
        // Load emails - restore saved filter if exists
        SharedPreferences prefs = getSharedPreferences("theme_prefs", MODE_PRIVATE);
        String savedFilter = prefs.getString("saved_filter", null);
        String savedDisplayName = prefs.getString("saved_display_name", null);

        if (savedFilter != null && !savedFilter.equals("inbox")) {
            // Restore the saved filter
            if (savedFilter.equals("starred")) {
                viewModel.loadStarredEmails();
            } else if (savedFilter.equals("spam")) {
                viewModel.loadSpamEmails();
            } else {
                viewModel.loadEmailsByLabel(savedFilter, savedDisplayName);
            }

            // Clear the saved filter
            prefs.edit().remove("saved_filter").remove("saved_display_name").apply();
        } else {
            viewModel.loadEmails(); // Default inbox
        }
    }

    private void initViews() {
        recyclerView = findViewById(R.id.recyclerViewEmails);
        FloatingActionButton fab = findViewById(R.id.fabCompose);

        // Navigation Drawer
        drawerLayout = findViewById(R.id.drawerLayout);
        navigationView = findViewById(R.id.navigationView);

        setupFab(fab);
    }

    private void loadThemePreference() {
        SharedPreferences prefs = getSharedPreferences("theme_prefs", MODE_PRIVATE);
        int nightMode = prefs.getInt("night_mode", AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM);
        AppCompatDelegate.setDefaultNightMode(nightMode);
    }

    private void setupNavigationDrawer() {
        navigationView.setNavigationItemSelectedListener(this);
        navigationView.setCheckedItem(R.id.nav_inbox);

        setupNavigationHeader();
        loadCustomLabels();
    }


    private void setupNavigationHeader() {
        // Get header view
        View headerView = navigationView.getHeaderView(0);

        // Find views in header
        TextView tvUserEmail = headerView.findViewById(R.id.tvUserEmail);
        ImageView ivProfileImage = headerView.findViewById(R.id.ivProfileImage);
        TextView tvProfileAvatar = headerView.findViewById(R.id.tvProfileAvatar);
        Button btnCreateNewLabel = headerView.findViewById(R.id.btnCreateNewLabel);

        // Set current user email
        String currentUserEmail = TokenManager.getCurrentUserEmail(this);
        String currentUserId = TokenManager.getCurrentUserId(this);

        System.out.println("=== NAVIGATION HEADER DEBUG ===");
        System.out.println("User email: " + currentUserEmail);
        System.out.println("User ID: " + currentUserId);

        if (currentUserEmail != null) {
            tvUserEmail.setText(currentUserEmail);

            // Set default letter avatar
            String firstLetter = currentUserEmail.substring(0, 1).toUpperCase();
            tvProfileAvatar.setText(firstLetter);

            // Try to load profile image
            if (currentUserId != null && ivProfileImage != null) {
                loadProfileImageInDrawer(currentUserId, ivProfileImage, tvProfileAvatar);
            }
        }

        // Setup create label button
        btnCreateNewLabel.setOnClickListener(v -> {
            drawerLayout.closeDrawer(GravityCompat.START);
            showCreateLabelDialog();
        });
    }

    private void loadProfileImageInDrawer(String userId, ImageView imageView, TextView textView) {
        System.out.println("=== LOADING AVATAR FOR DRAWER: " + userId + " ===");

        UserAPI userAPI = BackendClient.get(this).create(UserAPI.class);

        userAPI.getAvatar(userId).enqueue(new Callback<ResponseBody>() {
            @Override
            public void onResponse(Call<ResponseBody> call, Response<ResponseBody> response) {
                System.out.println("=== DRAWER AVATAR API RESPONSE ===");
                System.out.println("Response code: " + response.code());

                if (response.isSuccessful() && response.body() != null) {
                    try {
                        byte[] imageBytes = response.body().bytes();
                        System.out.println("✓ Image loaded successfully, size: " + imageBytes.length + " bytes");

                        BitmapFactory.Options options = new BitmapFactory.Options();
                        options.inJustDecodeBounds = false;
                        Bitmap bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length, options);

                        if (bitmap != null) {
                            runOnUiThread(() -> {
                                System.out.println("=== SWITCHING TO IMAGE IN DRAWER ===");

                                textView.setVisibility(View.GONE);
                                imageView.setVisibility(View.VISIBLE);

                                // Create circular image and set it
                                Bitmap circularBitmap = createCircularBitmap(bitmap);
                                imageView.setImageBitmap(circularBitmap);

                                System.out.println("✓ Image set in drawer successfully");
                            });
                        } else {
                            System.out.println("✗ Bitmap decoding failed - keeping letter avatar");
                            runOnUiThread(() -> {
                                textView.setVisibility(View.VISIBLE);
                                imageView.setVisibility(View.GONE);
                            });
                        }
                    } catch (Exception e) {
                        System.out.println("✗ Exception in image processing: " + e.getMessage());
                        runOnUiThread(() -> {
                            textView.setVisibility(View.VISIBLE);
                            imageView.setVisibility(View.GONE);
                        });
                    }
                } else {
                    System.out.println("✗ API response failed - keeping letter avatar");
                    runOnUiThread(() -> {
                        textView.setVisibility(View.VISIBLE);
                        imageView.setVisibility(View.GONE);
                    });
                }
            }

            @Override
            public void onFailure(Call<ResponseBody> call, Throwable t) {
                System.out.println("=== DRAWER AVATAR API FAILURE ===");
                System.out.println("✗ Failed to load avatar: " + t.getMessage());
                runOnUiThread(() -> {
                    textView.setVisibility(View.VISIBLE);
                    imageView.setVisibility(View.GONE);
                });
            }
        });
    }

    private Bitmap createCircularBitmap(Bitmap bitmap) {
        System.out.println("=== CREATING CIRCULAR BITMAP ===");
        System.out.println("Input bitmap: " + bitmap.getWidth() + "x" + bitmap.getHeight());

        int width = bitmap.getWidth();
        int height = bitmap.getHeight();
        int size = Math.min(width, height);

        Bitmap output = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(output);

        Paint paint = new Paint();
        paint.setAntiAlias(true);

        canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint);
        paint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC_IN));

        canvas.drawBitmap(bitmap, (size - width) / 2f, (size - height) / 2f, paint);

        System.out.println("✓ Circular bitmap created: " + output.getWidth() + "x" + output.getHeight());
        return output;
    }

    private void loadCustomLabels() {
        LabelAPI labelAPI = BackendClient.get(this).create(LabelAPI.class);

        labelAPI.getAllLabels().enqueue(new Callback<List<Label>>() {
            @Override
            public void onResponse(Call<List<Label>> call, Response<List<Label>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    addCustomLabelsToMenu(response.body());
                } else {
                    System.out.println("Failed to load labels: " + response.code());
                }
            }

            @Override
            public void onFailure(Call<List<Label>> call, Throwable t) {
                System.out.println("Error loading labels: " + t.getMessage());
            }
        });
    }

    private void addCustomLabelsToMenu(List<Label> allLabels) {
        // Filter only custom labels (not system)
        List<Label> customLabels = new ArrayList<>();
        for (Label label : allLabels) {
            if (!label.isSystem) {
                customLabels.add(label);
            }
        }

        if (customLabels.isEmpty()) {
            return; // No custom labels
        }

        // Get the Navigation View menu
        Menu menu = navigationView.getMenu();

        // Remove existing labels in custom group
        menu.removeGroup(R.id.group_custom_labels);

        // Add header for custom labels
        menu.add(R.id.group_custom_labels, Menu.NONE, Menu.NONE, getString(R.string.nav_personal_labels))
                .setEnabled(false);

        // Add the new labels
        for (int i = 0; i < customLabels.size(); i++) {
            Label label = customLabels.get(i);
            MenuItem item = menu.add(R.id.group_custom_labels,
                    View.generateViewId(), i + 1, label.name);
            item.setIcon(android.R.drawable.ic_menu_mylocation);

            setupLongClickForCustomLabel(item, label);
        }
    }

    private void setupLongClickForCustomLabel(MenuItem menuItem, Label label) {
        // Android doesn't support long click directly on MenuItem
        // Use alternative solution - add ContextMenu on regular click if it's custom label

        // Store the label in Intent for handling in onNavigationItemSelected
        menuItem.getIntent();
        if (menuItem.getIntent() == null) {
            menuItem.setIntent(new android.content.Intent());
        }
        menuItem.getIntent().putExtra("custom_label_id", label.id);
        menuItem.getIntent().putExtra("custom_label_name", label.name);
    }

    @Override
    public boolean onNavigationItemSelected(@NonNull MenuItem item) {
        drawerLayout.closeDrawer(GravityCompat.START);

        int itemId = item.getItemId();
        int groupId = item.getGroupId();

        // System labels (existing code)
        if (itemId == R.id.nav_inbox) {
            viewModel.loadEmails();
            return true;
        } else if (itemId == R.id.nav_sent) {
            viewModel.loadEmailsByLabel("sent", getString(R.string.nav_sent));
            return true;
        } else if (itemId == R.id.nav_drafts) {
            viewModel.loadEmailsByLabel("drafts", getString(R.string.nav_drafts));
            return true;
        } else if (itemId == R.id.nav_starred) {
            viewModel.loadStarredEmails();
            return true;
        } else if (itemId == R.id.nav_spam) {
            viewModel.loadSpamEmails();
            return true;
        } else if (itemId == R.id.nav_trash) {
            viewModel.loadEmailsByLabel("trash", getString(R.string.nav_trash));
            return true;
        }

        // Custom personal labels
        else if (groupId == R.id.group_custom_labels) {
            String labelName = item.getTitle().toString();

            // Skip the header "Personal Labels"
            if (labelName.equals(getString(R.string.nav_personal_labels))) {
                return true;
            }

            // Check if we have custom label info
            if (item.getIntent() != null &&
                    item.getIntent().hasExtra("custom_label_id")) {

                String labelId = item.getIntent().getStringExtra("custom_label_id");

                // Show options menu for custom label
                showCustomLabelOptions(labelId, labelName);
                return true;
            } else {
                // Regular label - open it
                viewModel.loadEmailsByLabel(labelName, labelName);
                return true;
            }
        }

        return false;
    }

    private void showCustomLabelOptions(String labelId, String labelName) {
        String[] options = {
                getString(R.string.show_emails),
                getString(R.string.edit_label),
                getString(R.string.delete_label)
        };

        new AlertDialog.Builder(this)
                .setTitle("'" + labelName + "'")
                .setItems(options, (dialog, which) -> {
                    switch (which) {
                        case 0: // Show emails
                            viewModel.loadEmailsByLabel(labelName, labelName);
                            break;
                        case 1: // Edit label
                            showEditLabelDialog(labelId, labelName);
                            break;
                        case 2: // Delete label
                            showDeleteLabelDialog(labelId, labelName);
                            break;
                    }
                })
                .setNegativeButton(getString(R.string.cancel), null)
                .show();
    }

    private void showEditLabelDialog(String labelId, String currentName) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle(getString(R.string.edit_label_title));

        final EditText input = new EditText(this);
        input.setText(currentName);
        input.setSelection(currentName.length());
        input.setPadding(32, 32, 32, 32);
        builder.setView(input);

        builder.setPositiveButton(getString(R.string.update), (dialog, which) -> {
            String newName = input.getText().toString().trim();
            if (!newName.isEmpty()) {
                if (!newName.equals(currentName)) {
                    updateLabel(labelId, newName);
                } else {
                    Toast.makeText(this, getString(R.string.error_no_changes), Toast.LENGTH_SHORT).show();
                }
            } else {
                Toast.makeText(this, getString(R.string.error_label_name_required), Toast.LENGTH_SHORT).show();
            }
        });

        builder.setNegativeButton(getString(R.string.cancel), null);
        AlertDialog dialog = builder.create();
        dialog.show();
        input.requestFocus();
    }

    private void showDeleteLabelDialog(String labelId, String labelName) {
        new AlertDialog.Builder(this)
                .setTitle(getString(R.string.delete_label_title))
                .setMessage(getString(R.string.delete_label_message, labelName))
                .setIcon(android.R.drawable.ic_dialog_alert)
                .setPositiveButton(getString(R.string.delete), (dialog, which) -> deleteLabel(labelId, labelName))
                .setNegativeButton(getString(R.string.cancel), null)
                .show();
    }

    private void updateLabel(String labelId, String newName) {
        LabelAPI labelAPI = BackendClient.get(this).create(LabelAPI.class);
        UpdateLabelRequest request = new UpdateLabelRequest(newName);

        labelAPI.updateLabel(labelId, request).enqueue(new Callback<Label>() {
            @Override
            public void onResponse(Call<Label> call, Response<Label> response) {
                if (response.isSuccessful() && response.body() != null) {
                    Toast.makeText(InboxActivity.this,
                            getString(R.string.label_updated, response.body().name), Toast.LENGTH_SHORT).show();
                    refreshNavigationMenu();
                } else {
                    handleLabelError(getString(R.string.update), response.code());
                }
            }

            @Override
            public void onFailure(Call<Label> call, Throwable t) {
                Toast.makeText(InboxActivity.this,
                        getString(R.string.error_server_connection, t.getMessage()), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void deleteLabel(String labelId, String labelName) {
        LabelAPI labelAPI = BackendClient.get(this).create(LabelAPI.class);

        labelAPI.deleteLabel(labelId).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(Call<Void> call, Response<Void> response) {
                if (response.isSuccessful()) {
                    Toast.makeText(InboxActivity.this,
                            getString(R.string.label_deleted, labelName), Toast.LENGTH_SHORT).show();

                    String currentFilter = viewModel.getCurrentFilter().getValue();
                    // Compare both original case and lowercase
                    if (labelName.equalsIgnoreCase(currentFilter) ||
                            labelName.toLowerCase().equals(currentFilter)) {
                        viewModel.loadEmails(); // Return to inbox
                        Toast.makeText(InboxActivity.this,
                                getString(R.string.label_deleted_returning_inbox), Toast.LENGTH_SHORT).show();
                    }

                    refreshNavigationMenu();
                } else {
                    handleLabelError(getString(R.string.delete), response.code());
                }
            }

            @Override
            public void onFailure(Call<Void> call, Throwable t) {
                Toast.makeText(InboxActivity.this,
                        getString(R.string.error_server_connection, t.getMessage()), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void handleLabelError(String action, int responseCode) {
        String message;
        switch (responseCode) {
            case 404:
                message = getString(R.string.error_label_not_found);
                break;
            case 409:
                message = getString(R.string.error_label_exists);
                break;
            case 403:
                message = getString(R.string.error_no_permission);
                break;
            default:
                if (action.equals(getString(R.string.update))) {
                    message = getString(R.string.error_updating_label, responseCode);
                } else if (action.equals(getString(R.string.delete))) {
                    message = getString(R.string.error_deleting_label, responseCode);
                } else {
                    message = "Error " + action + " label (code " + responseCode + ")";
                }
        }
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }

    private void refreshNavigationMenu() {
        // Refresh labels after creating new label
        loadCustomLabels();
    }

    private void handleEditDraft(Email email) {
        Intent intent = new Intent(this, ComposeActivity.class);
        intent.putExtra("is_draft", true);
        intent.putExtra("draft_id", email.id);
        intent.putExtra("draft_to", email.recipients != null ? String.join(", ", email.recipients) : "");
        intent.putExtra("draft_subject", email.subject);
        intent.putExtra("draft_content", email.content);
        startActivity(intent);
    }

    private void setupRecyclerView() {
        String currentUserEmail = TokenManager.getCurrentUserEmail(this);
        System.out.println("Current user email from token: " + currentUserEmail);

        adapter = new EmailAdapter(email -> {
            // Mark email as read when clicked
            markEmailAsRead(email.id);

            // Check if it's a draft
            boolean isDraft = (email.labels != null && email.labels.contains("drafts"));

            if (isDraft) {
                // Draft - open for editing
                handleEditDraft(email);
            } else {
                // Regular email - show details
                Intent intent = new Intent(this, EmailDetailActivity.class);
                intent.putExtra("email_id", email.id);
                intent.putExtra("sender", email.sender);
                intent.putExtra("subject", email.subject);
                intent.putExtra("content", email.content);
                intent.putExtra("timestamp", email.timestamp);
                startActivity(intent);
            }
        }, currentUserEmail, this::isEmailRead);  // הוספנו פרמטר שלישי

        // Set other listeners
        adapter.setDeleteListener(this::handleEmailDelete);
        adapter.setStarListener(this::handleEmailStar);
        adapter.setEditDraftListener(this::handleEditDraft);

        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        recyclerView.setAdapter(adapter);
    }

    private void handleEmailDelete(Email email) {
        // Simple logic based on server:
        // If in trash → permanent delete (DELETE API)
        // Otherwise → move to trash (replace all labels with "trash" only)

        if ("trash".equals(currentFilter)) {
            // In trash - confirm permanent delete
            showPermanentDeleteConfirmation(email);
        } else {
            // Regular mode - move to trash (replace all labels with trash)
            viewModel.moveToTrash(email.id, success -> {
                if (success) {
                    Toast.makeText(this, getString(R.string.moved_to_trash), Toast.LENGTH_SHORT).show();
                    viewModel.refreshCurrentFilter(); // Refresh list
                } else {
                    Toast.makeText(this, getString(R.string.error_moving_to_trash), Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    private void showPermanentDeleteConfirmation(Email email) {
        new AlertDialog.Builder(this)
                .setTitle(getString(R.string.permanent_delete_title))
                .setMessage(getString(R.string.permanent_delete_message))
                .setIcon(android.R.drawable.ic_dialog_alert)
                .setPositiveButton(getString(R.string.delete_permanently), (dialog, which) -> {
                    // Use DELETE API
                    viewModel.deleteEmail(email.id, success -> {
                        if (success) {
                            Toast.makeText(InboxActivity.this, getString(R.string.permanently_deleted), Toast.LENGTH_SHORT).show();
                            viewModel.refreshCurrentFilter(); // Refresh list
                        } else {
                            Toast.makeText(InboxActivity.this, getString(R.string.error_deleting_email), Toast.LENGTH_SHORT).show();
                        }
                    });
                })
                .setNegativeButton(getString(R.string.cancel), null)
                .show();
    }

    private void setupObservers() {
        System.out.println("=== SETTING UP OBSERVERS ===");

        viewModel.getEmails().observe(this, emails -> {
            System.out.println("=== ADAPTER DEBUG ===");
            System.out.println("updateEmails called with emails: " + (emails != null ? emails.size() : "null"));

            if (emails != null && adapter != null) {
                adapter.updateEmails(emails);
                System.out.println("Final adapter size: " + adapter.getItemCount());
            }
            System.out.println("==================");
        });

        viewModel.getRoomEmails().observe(this, roomEmails -> {
            System.out.println("=== ROOM DEBUG 6: Observer triggered ===");
            System.out.println("roomEmails is null: " + (roomEmails == null));
            if (roomEmails != null) {
                System.out.println("roomEmails size: " + roomEmails.size());
            }
            System.out.println("===============================");
        });

        // Observer for screen title update
        viewModel.getCurrentFilterDisplayName().observe(this, displayName -> {
            TextView tvWelcome = findViewById(R.id.tvWelcome);
            if (tvWelcome != null && displayName != null) {
                tvWelcome.setText(displayName);
            }
        });

        // Observer for current filter tracking
        viewModel.getCurrentFilter().observe(this, filter -> {
            currentFilter = filter != null ? filter : "inbox";
            System.out.println("Current filter changed to: " + currentFilter);
        });

        // Add within setupObservers()
        viewModel.getSearchResults().observe(this, searchResults -> {
            if (searchResults != null) {
                adapter.updateEmails(searchResults);
                System.out.println("Search results: " + searchResults.size() + " emails found");
            }
        });

        viewModel.getIsSearching().observe(this, isSearching -> {
            if (isSearching != null && isSearching) {
                Toast.makeText(this, getString(R.string.searching), Toast.LENGTH_SHORT).show();
            }
        });

        viewModel.getRoomEmails().observe(this, roomEmails -> {
            System.out.println("=== ROOM OBSERVER TRIGGERED ===");
            System.out.println("Room emails count: " + (roomEmails != null ? roomEmails.size() : "null"));

            if (roomEmails != null) {
                System.out.println("First 3 Room emails:");
                for (int i = 0; i < Math.min(3, roomEmails.size()); i++) {
                    Email email = roomEmails.get(i);
                    System.out.println("  " + (i+1) + ". " + email.subject + " (from: " + email.sender + ")");
                }
            }
            System.out.println("==============================");
        });

        viewModel.getHasNextPage().observe(this, hasNext -> {
            Button btnNext = findViewById(R.id.btnNextPage);
            if (btnNext != null) {
                btnNext.setEnabled(hasNext != null && hasNext);
            }
        });

        viewModel.getHasPreviousPage().observe(this, hasPrev -> {
            Button btnPrev = findViewById(R.id.btnPreviousPage);
            if (btnPrev != null) {
                btnPrev.setEnabled(hasPrev != null && hasPrev);
            }
        });

        viewModel.getTotalPages().observe(this, totalPages -> {
            TextView tvPageInfo = findViewById(R.id.tvPageInfo);
            if (tvPageInfo != null && totalPages != null) {
                tvPageInfo.setText(getString(R.string.page_info, viewModel.getCurrentPage(), totalPages));
            }
        });

        System.out.println("Observer setup complete");
    }

    @Override
    protected void onResume() {
        super.onResume();
        viewModel.refreshCurrentFilter();
    }

    private void setupFab(FloatingActionButton fab) {
        fab.setOnClickListener(v -> {
            startActivity(new Intent(this, ComposeActivity.class));
        });
    }

    private void setupHeader() {
        ImageView ivMenu = findViewById(R.id.ivMenu);
        ImageView ivThemeToggle = findViewById(R.id.ivThemeToggle);
        TextView tvProfileAvatar = findViewById(R.id.tvProfileAvatar);
        ImageView ivProfileImageHeader = findViewById(R.id.ivProfileImageHeader);
        LinearLayout searchBar = findViewById(R.id.searchBar);

        // Menu hamburger button
        if (ivMenu != null) {
            ivMenu.setOnClickListener(v -> {
                if (drawerLayout.isDrawerOpen(GravityCompat.START)) {
                    drawerLayout.closeDrawer(GravityCompat.START);
                } else {
                    drawerLayout.openDrawer(GravityCompat.START);
                }
            });
        }

        // Theme toggle button
        if (ivThemeToggle != null) {
            updateThemeIcon(ivThemeToggle);
            ivThemeToggle.setOnClickListener(v -> {
                toggleTheme();
                updateThemeIcon(ivThemeToggle);
            });
        }

        String currentUserId = TokenManager.getCurrentUserId(this);
        String userEmail = TokenManager.getCurrentUserEmail(this);

        System.out.println("=== HEADER PROFILE IMAGE DEBUG ===");
        System.out.println("User ID: " + currentUserId);
        System.out.println("User Email: " + userEmail);

        if (userEmail != null && !userEmail.isEmpty()) {
            // Set default letter avatar
            String firstLetter = userEmail.substring(0, 1).toUpperCase();
            tvProfileAvatar.setText(firstLetter);

            // Try to load profile image
            if (currentUserId != null && ivProfileImageHeader != null) {
                loadProfileImageInHeader(currentUserId, ivProfileImageHeader, tvProfileAvatar);
            }
        }

        // Profile avatar - user options
        if (tvProfileAvatar != null) {
            tvProfileAvatar.setOnClickListener(v -> showUserProfileMenu());
        }

        if (ivProfileImageHeader != null) {
            ivProfileImageHeader.setOnClickListener(v -> showUserProfileMenu());
        }

        // Search
        if (searchBar != null) {
            searchBar.setOnClickListener(v -> showSearchDialog());
        }
    }

    private void loadProfileImageInHeader(String userId, ImageView imageView, TextView textView) {
        System.out.println("=== LOADING AVATAR FOR HEADER: " + userId + " ===");

        UserAPI userAPI = BackendClient.get(this).create(UserAPI.class);

        userAPI.getAvatar(userId).enqueue(new Callback<ResponseBody>() {
            @Override
            public void onResponse(Call<ResponseBody> call, Response<ResponseBody> response) {
                if (response.isSuccessful() && response.body() != null) {
                    try {
                        byte[] imageBytes = response.body().bytes();
                        Bitmap bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length);

                        if (bitmap != null) {
                            runOnUiThread(() -> {
                                System.out.println("=== SWITCHING TO IMAGE IN HEADER ===");

                                textView.setVisibility(View.GONE);
                                imageView.setVisibility(View.VISIBLE);

                                // Create circular image and set it
                                Bitmap circularBitmap = createCircularBitmap(bitmap);
                                imageView.setImageBitmap(circularBitmap);

                                System.out.println("✓ Image set in header successfully");
                            });
                        } else {
                            runOnUiThread(() -> {
                                textView.setVisibility(View.VISIBLE);
                                imageView.setVisibility(View.GONE);
                            });
                        }
                    } catch (Exception e) {
                        runOnUiThread(() -> {
                            textView.setVisibility(View.VISIBLE);
                            imageView.setVisibility(View.GONE);
                        });
                    }
                } else {
                    runOnUiThread(() -> {
                        textView.setVisibility(View.VISIBLE);
                        imageView.setVisibility(View.GONE);
                    });
                }
            }

            @Override
            public void onFailure(Call<ResponseBody> call, Throwable t) {
                runOnUiThread(() -> {
                    textView.setVisibility(View.VISIBLE);
                    imageView.setVisibility(View.GONE);
                });
            }
        });
    }

    private void updateThemeIcon(ImageView themeIcon) {
        int currentMode = AppCompatDelegate.getDefaultNightMode();
        if (currentMode == AppCompatDelegate.MODE_NIGHT_YES) {
            // Dark mode - show sun (to switch to light)
            themeIcon.setImageResource(R.drawable.ic_theme_light);
        } else {
            // Light mode - show moon (to switch to dark)
            themeIcon.setImageResource(R.drawable.ic_theme_dark);
        }
    }

    private void showUserProfileMenu() {
        String[] options = {
                getString(R.string.refresh),
                getString(R.string.logout)
        };

        new AlertDialog.Builder(this)
                .setTitle(getString(R.string.user_options))
                .setItems(options, (dialog, which) -> {
                    switch (which) {
                        case 0: // Refresh
                            viewModel.refreshCurrentFilter();
                            Toast.makeText(this, getString(R.string.refreshing), Toast.LENGTH_SHORT).show();
                            break;
                        case 1: // Logout
                            showLogoutConfirmation();
                            break;
                    }
                })
                .setNegativeButton(getString(R.string.cancel), null)
                .show();
    }

    private void toggleTheme() {
        int currentMode = AppCompatDelegate.getDefaultNightMode();
        int newMode = (currentMode == AppCompatDelegate.MODE_NIGHT_YES) ?
                AppCompatDelegate.MODE_NIGHT_NO : AppCompatDelegate.MODE_NIGHT_YES;

        // Save current filter before theme change
        SharedPreferences prefs = getSharedPreferences("theme_prefs", MODE_PRIVATE);
        String currentFilter = viewModel.getCurrentFilter().getValue();
        String currentDisplayName = viewModel.getCurrentFilterDisplayName().getValue();

        prefs.edit()
                .putInt("night_mode", newMode)
                .putString("saved_filter", currentFilter != null ? currentFilter : "inbox")
                .putString("saved_display_name", currentDisplayName != null ? currentDisplayName : "Inbox")
                .apply();

        // Switch theme
        AppCompatDelegate.setDefaultNightMode(newMode);
    }
    private void showUserOptions() {
        String[] options = {
                getString(R.string.refresh),
                getString(R.string.logout)
        };

        new AlertDialog.Builder(this)
                .setTitle(getString(R.string.user_options))
                .setItems(options, (dialog, which) -> {
                    switch (which) {
                        case 0: // Refresh
                            viewModel.refreshCurrentFilter();
                            Toast.makeText(this, getString(R.string.refreshing), Toast.LENGTH_SHORT).show();
                            break;
                        case 1: // Logout
                            showLogoutConfirmation();
                            break;
                    }
                })
                .show();
    }

    private void showSearchDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle(getString(R.string.search_title));

        final EditText input = new EditText(this);
        input.setHint(getString(R.string.search_hint));
        input.setPadding(32, 32, 32, 32);
        builder.setView(input);

        builder.setPositiveButton(getString(R.string.search), (dialog, which) -> {
            String query = input.getText().toString().trim();
            if (!query.isEmpty()) {
                performSearch(query);
            } else {
                Toast.makeText(this, getString(R.string.error_search_terms_required), Toast.LENGTH_SHORT).show();
            }
        });

        builder.setNegativeButton(getString(R.string.cancel), null);

        builder.setNeutralButton(getString(R.string.clear), (dialog, which) -> {
            clearSearch();
        });

        AlertDialog dialog = builder.create();
        dialog.show();
        input.requestFocus();
    }

    private void performSearch(String query) {
        viewModel.searchEmails(query);
        currentFilter = "search"; // Update state
        TextView tvWelcome = findViewById(R.id.tvWelcome);
        tvWelcome.setText(getString(R.string.search_results, query));
    }

    private void clearSearch() {
        viewModel.clearSearch();
        viewModel.refreshCurrentFilter(); // Return to previous state
        Toast.makeText(this, getString(R.string.search_cleared), Toast.LENGTH_SHORT).show();
    }

    private void showCreateLabelDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle(getString(R.string.create_label_title));

        final EditText input = new EditText(this);
        input.setHint(getString(R.string.label_name_hint));
        input.setPadding(32, 32, 32, 32);
        builder.setView(input);

        builder.setPositiveButton(getString(R.string.create), (dialog, which) -> {
            String labelName = input.getText().toString().trim();
            if (!labelName.isEmpty()) {
                createLabel(labelName);
            } else {
                Toast.makeText(InboxActivity.this,
                        getString(R.string.error_label_name_required), Toast.LENGTH_SHORT).show();
            }
        });

        builder.setNegativeButton(getString(R.string.cancel), null);

        AlertDialog dialog = builder.create();
        dialog.show();

        // Focus on input
        input.requestFocus();
    }

    private void createLabel(String labelName) {
        LabelAPI labelAPI = BackendClient.get(this).create(LabelAPI.class);
        CreateLabelRequest request = new CreateLabelRequest(labelName);

        labelAPI.createLabel(request).enqueue(new Callback<Label>() {
            @Override
            public void onResponse(Call<Label> call, Response<Label> response) {
                if (response.isSuccessful() && response.body() != null) {
                    Label newLabel = response.body();
                    Toast.makeText(InboxActivity.this,
                            getString(R.string.label_created, newLabel.name), Toast.LENGTH_SHORT).show();

                    // Refresh menu to show new label
                    refreshNavigationMenu();

                } else if (response.code() == 409) {
                    // Handle duplicate label error specifically
                    Toast.makeText(InboxActivity.this,
                            "Label already exists (labels are case insensitive)",
                            Toast.LENGTH_LONG).show();
                } else if (response.code() == 400) {
                    // Handle invalid input (system label names, empty names, etc.)
                    Toast.makeText(InboxActivity.this,
                            "Invalid label name", Toast.LENGTH_SHORT).show();
                } else {
                    Toast.makeText(InboxActivity.this,
                            getString(R.string.error_creating_label, response.code()), Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<Label> call, Throwable t) {
                Toast.makeText(InboxActivity.this,
                        getString(R.string.error_server_connection, t.getMessage()), Toast.LENGTH_SHORT).show();
            }
        });
    }

    @Override
    public void onBackPressed() {
        if (drawerLayout.isDrawerOpen(GravityCompat.START)) {
            drawerLayout.closeDrawer(GravityCompat.START);
        } else {
            super.onBackPressed();
        }
    }

    private void showLogoutConfirmation() {
        new AlertDialog.Builder(this)
                .setTitle(getString(R.string.logout_title))
                .setMessage(getString(R.string.logout_message))
                .setPositiveButton(getString(R.string.logout), (dialog, which) -> logout())
                .setNegativeButton(getString(R.string.cancel), null)
                .show();
    }

    private void logout() {
        System.out.println("=== LOGOUT PROCESS STARTED ===");

        // Clear content from all locations
        TokenManager.clear(this);

        android.content.SharedPreferences prefs = getSharedPreferences("user_prefs", MODE_PRIVATE);
        prefs.edit().clear().apply();

        System.out.println("=== USER DATA CLEARED ===");

        // Return to login screen and clear stack
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();

        Toast.makeText(this, getString(R.string.logout_successful), Toast.LENGTH_SHORT).show();
        System.out.println("=== LOGOUT COMPLETED ===");
    }

    private void handleEmailStar(Email email) {
        boolean isCurrentlyStarred = email.labels != null && email.labels.contains("starred");

        viewModel.toggleStar(email.id, success -> {
            if (success) {
                if (isCurrentlyStarred) {
                    Toast.makeText(this, getString(R.string.star_removed), Toast.LENGTH_SHORT).show();
                } else {
                    Toast.makeText(this, getString(R.string.star_added), Toast.LENGTH_SHORT).show();
                }
                viewModel.refreshCurrentFilter(); // Refresh list
            } else {
                Toast.makeText(this, getString(R.string.error_updating_star), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void setupPaginationControls() {
        Button btnNext = findViewById(R.id.btnNextPage);
        Button btnPrev = findViewById(R.id.btnPreviousPage);

        if (btnNext != null) {
            btnNext.setOnClickListener(v -> viewModel.goToNextPage());
        }

        if (btnPrev != null) {
            btnPrev.setOnClickListener(v -> viewModel.goToPreviousPage());
        }
    }

    // Helper methods for read/unread functionality
    private String getCurrentUserEmail() {
        return TokenManager.getCurrentUserEmail(this);
    }

    private boolean isEmailRead(String emailId) {
        String userEmail = getCurrentUserEmail();
        if (userEmail == null || userEmail.isEmpty()) return false;

        SharedPreferences readEmails = getSharedPreferences("read_emails_" + userEmail, MODE_PRIVATE);
        return readEmails.getBoolean(emailId, false);
    }

    private void markEmailAsRead(String emailId) {
        String userEmail = getCurrentUserEmail();
        if (userEmail == null || userEmail.isEmpty()) return;

        SharedPreferences readEmails = getSharedPreferences("read_emails_" + userEmail, MODE_PRIVATE);
        readEmails.edit().putBoolean(emailId, true).apply();

        System.out.println("Marked email as read: " + emailId + " for user: " + userEmail);
    }
}