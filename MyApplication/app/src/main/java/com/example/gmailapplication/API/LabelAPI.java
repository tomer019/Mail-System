package com.example.gmailapplication.API;

import com.example.gmailapplication.shared.*;

import java.util.List;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.DELETE;
import retrofit2.http.GET;
import retrofit2.http.PATCH;
import retrofit2.http.POST;
import retrofit2.http.Path;

public interface LabelAPI {

    // Get all labels (system + custom)
    @GET("labels")
    Call<List<Label>> getAllLabels();

    // Get label by ID
    @GET("labels/{id}")
    Call<Label> getLabelById(@Path("id") String labelId);

    // Create new label (custom only)
    @POST("labels")
    Call<Label> createLabel(@Body CreateLabelRequest request);

    // Update label (custom only)
    @PATCH("labels/{id}")
    Call<Label> updateLabel(@Path("id") String labelId, @Body UpdateLabelRequest request);

    // Delete label (custom only)
    @DELETE("labels/{id}")
    Call<Void> deleteLabel(@Path("id") String labelId);

    // Search labels
    @GET("labels/search/{query}")
    Call<List<Label>> searchLabels(@Path("query") String query);

    // Add label to email
    @POST("labels/tag")
    Call<TagResponse> tagMail(@Body TagMailRequest request);

    // Remove label from email
    @POST("labels/untag")
    Call<UntagResponse> untagMail(@Body UntagMailRequest request);

    // Get labels of an email
    @GET("labels/mail/{mailId}")
    Call<List<String>> getLabelsForMail(@Path("mailId") String mailId);

    // Get emails by label (uses labelId)
    @GET("labels/by-label/{labelId}")
    Call<List<String>> getMailsByLabel(@Path("labelId") String labelId);
}