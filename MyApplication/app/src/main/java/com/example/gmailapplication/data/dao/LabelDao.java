package com.example.gmailapplication.data.dao;

import androidx.lifecycle.LiveData;
import androidx.room.*;
import com.example.gmailapplication.shared.Label;
import java.util.List;

@Dao
public interface LabelDao {
    @Query("SELECT * FROM labels")
    List<Label> getAllLabels();

    @Query("SELECT * FROM labels ORDER BY name ASC")
    LiveData<List<Label>> getAllLabelsLive();

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertLabels(List<Label> labels);

    @Query("DELETE FROM labels")
    void deleteAll();
}