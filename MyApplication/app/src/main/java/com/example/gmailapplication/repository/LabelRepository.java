package com.example.gmailapplication.repository;

import android.content.Context;
import androidx.lifecycle.LiveData;
import com.example.gmailapplication.API.BackendClient;
import com.example.gmailapplication.API.LabelAPI;
import com.example.gmailapplication.data.AppDatabase;
import com.example.gmailapplication.data.dao.LabelDao;
import com.example.gmailapplication.shared.Label;
import com.example.gmailapplication.shared.CreateLabelRequest;
import com.example.gmailapplication.shared.UpdateLabelRequest;

import java.util.List;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class LabelRepository {
    private LabelAPI labelAPI;
    private LabelDao labelDao;

    public LabelRepository(Context context) {
        labelAPI = BackendClient.get(context).create(LabelAPI.class);
        labelDao = AppDatabase.getInstance(context).labelDao();
        System.out.println("LabelRepository: initialized with Room");
    }

    // API Methods (as they were)
    public Call<List<Label>> getAllLabels() {
        return labelAPI.getAllLabels();
    }

    public Call<Label> createLabel(CreateLabelRequest request) {
        return labelAPI.createLabel(request);
    }

    public Call<Label> updateLabel(String labelId, UpdateLabelRequest request) {
        return labelAPI.updateLabel(labelId, request);
    }

    public Call<Void> deleteLabel(String labelId) {
        return labelAPI.deleteLabel(labelId);
    }

    // Room Methods (new)
    public LiveData<List<Label>> getLabelsWithRoom() {
        // Refresh from server
        refreshLabelsFromServer();
        // Return from Room
        return labelDao.getAllLabelsLive();
    }

    public void saveLabelsToRoom(List<Label> labels) {
        new Thread(() -> {
            try {
                labelDao.deleteAll();
                labelDao.insertLabels(labels);
                System.out.println("LabelRepository: Saved " + labels.size() + " labels to Room");
            } catch (Exception e) {
                System.err.println("LabelRepository: Error saving labels: " + e.getMessage());
            }
        }).start();
    }

    private void refreshLabelsFromServer() {
        System.out.println("LabelRepository: Refreshing labels from server");

        labelAPI.getAllLabels().enqueue(new Callback<List<Label>>() {
            @Override
            public void onResponse(Call<List<Label>> call, Response<List<Label>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    System.out.println("LabelRepository: Server response received, saving to Room");
                    saveLabelsToRoom(response.body());
                } else {
                    System.err.println("LabelRepository: Server response failed: " + response.code());
                }
            }

            @Override
            public void onFailure(Call<List<Label>> call, Throwable t) {
                System.err.println("LabelRepository: Network failure: " + t.getMessage());
            }
        });
    }
}