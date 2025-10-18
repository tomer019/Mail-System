package com.example.gmailapplication;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.LinearLayout;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.example.gmailapplication.API.BackendClient;
import com.example.gmailapplication.API.EmailAPI;
import com.example.gmailapplication.API.LabelAPI;
import com.example.gmailapplication.R;
import com.example.gmailapplication.shared.Label;
import com.example.gmailapplication.shared.UpdateLabelsRequest;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ManageLabelsActivity extends AppCompatActivity {
    private static final String EXTRA_MAIL_ID = "mail_id";
    private static final String EXTRA_CURRENT_LABELS = "current_labels";

    private LinearLayout layoutLabels;
    private Button btnSave;
    private Toolbar toolbar;

    private String mailId;
    private List<String> originalLabels;
    private List<Label> allLabels;
    private List<CheckBox> labelCheckboxes;

    private EmailAPI emailAPI;
    private LabelAPI labelAPI;

    public static void start(AppCompatActivity activity, String mailId, List<String> currentLabels) {
        Intent intent = new Intent(activity, ManageLabelsActivity.class);
        intent.putExtra(EXTRA_MAIL_ID, mailId);
        intent.putStringArrayListExtra(EXTRA_CURRENT_LABELS, new ArrayList<>(currentLabels));
        activity.startActivityForResult(intent, 100);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_manage_labels);

        initViews();
        initData();
        setupToolbar();
        loadLabels();
    }

    private void initViews() {
        toolbar = findViewById(R.id.toolbar);
        layoutLabels = findViewById(R.id.layoutLabels);
        btnSave = findViewById(R.id.btnSave);
        labelCheckboxes = new ArrayList<>();

        // Save button only
        btnSave.setOnClickListener(v -> saveLabels());
    }

    private void initData() {
        mailId = getIntent().getStringExtra(EXTRA_MAIL_ID);
        originalLabels = getIntent().getStringArrayListExtra(EXTRA_CURRENT_LABELS);
        if (originalLabels == null) originalLabels = new ArrayList<>();

        System.out.println("=== MANAGE LABELS INIT DEBUG ===");
        System.out.println("Mail ID received: '" + mailId + "'");
        System.out.println("Original labels received: " + originalLabels);
        System.out.println("Original labels size: " + (originalLabels != null ? originalLabels.size() : "null"));

        if (originalLabels != null) {
            for (int i = 0; i < originalLabels.size(); i++) {
                System.out.println("  OriginalLabel[" + i + "]: '" + originalLabels.get(i) + "'");
            }
        }
        System.out.println("===============================");

        emailAPI = BackendClient.get(this).create(EmailAPI.class);
        labelAPI = BackendClient.get(this).create(LabelAPI.class);
    }

    private void setupToolbar() {
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setTitle(getString(R.string.manage_labels_title));
        }
        toolbar.setNavigationOnClickListener(v -> {
            setResult(RESULT_CANCELED);
            finish();
        });
    }

    private void loadLabels() {
        labelAPI.getAllLabels().enqueue(new Callback<List<Label>>() {
            @Override
            public void onResponse(Call<List<Label>> call, Response<List<Label>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    allLabels = response.body();
                    displayLabels();
                } else {
                    Toast.makeText(ManageLabelsActivity.this,
                            getString(R.string.labels_load_error, response.code()), Toast.LENGTH_SHORT).show();
                    setResult(RESULT_CANCELED);
                    finish();
                }
            }

            @Override
            public void onFailure(Call<List<Label>> call, Throwable t) {
                Toast.makeText(ManageLabelsActivity.this,
                        getString(R.string.error_server_connection, t.getMessage()), Toast.LENGTH_SHORT).show();
                setResult(RESULT_CANCELED);
                finish();
            }
        });
    }

    private void displayLabels() {
        layoutLabels.removeAllViews();
        labelCheckboxes.clear();

        System.out.println("=== DISPLAY LABELS DEBUG ===");
        System.out.println("Original labels: " + originalLabels);
        System.out.println("All labels count: " + allLabels.size());

        for (Label label : allLabels) {
            // Skip trash label - managed by delete button only
            if ("trash".equals(label.name.toLowerCase())) {
                System.out.println("Skipping trash label - managed by delete button");
                continue;
            }

            // Skip important label - managed by star button only
            if ("important".equals(label.name.toLowerCase())) {
                System.out.println("Skipping important label - managed by star button");
                continue;
            }

            CheckBox checkBox = new CheckBox(this);
            checkBox.setText(label.name);
            checkBox.setTag(label);

            // Check name only (case insensitive)
            boolean isChecked = false;
            if (originalLabels != null) {
                for (String originalLabel : originalLabels) {
                    if (originalLabel != null && label.name != null &&
                            originalLabel.trim().equalsIgnoreCase(label.name.trim())) {
                        isChecked = true;
                        break;
                    }
                }
            }

            checkBox.setChecked(isChecked);

            System.out.println("Label: " + label.name + " (id: " + label.id + ") - Checked: " + isChecked);

            // Certain system labels cannot be changed manually
            if (label.isSystem && (label.name.equals("sent") || label.name.equals("drafts"))) {
                checkBox.setEnabled(false);
            }

            layoutLabels.addView(checkBox);
            labelCheckboxes.add(checkBox);
        }

        System.out.println("===========================");
    }

    private void saveLabels() {
        List<String> selectedLabels = new ArrayList<>();

        for (CheckBox checkBox : labelCheckboxes) {
            if (checkBox.isChecked()) {
                Label label = (Label) checkBox.getTag();
                selectedLabels.add(label.name);
            }
        }

        UpdateLabelsRequest request = new UpdateLabelsRequest(selectedLabels);

        emailAPI.updateEmailLabels(mailId, request).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(Call<Void> call, Response<Void> response) {
                if (response.isSuccessful()) {
                    Toast.makeText(ManageLabelsActivity.this,
                            getString(R.string.labels_updated), Toast.LENGTH_SHORT).show();

                    Intent resultIntent = new Intent();
                    resultIntent.putStringArrayListExtra("updated_labels", new ArrayList<>(selectedLabels));
                    setResult(RESULT_OK, resultIntent);
                    finish();
                } else {
                    Toast.makeText(ManageLabelsActivity.this,
                            getString(R.string.labels_update_error, response.code()), Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<Void> call, Throwable t) {
                Toast.makeText(ManageLabelsActivity.this,
                        getString(R.string.error_server_connection, t.getMessage()), Toast.LENGTH_SHORT).show();
            }
        });
    }

    @Override
    public void onBackPressed() {
        setResult(RESULT_CANCELED);
        super.onBackPressed();
    }
}