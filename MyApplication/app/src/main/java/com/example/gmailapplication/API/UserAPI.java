package com.example.gmailapplication.API;

import com.example.gmailapplication.shared.LoginRequest;
import com.example.gmailapplication.shared.LoginResponse;
import com.example.gmailapplication.shared.RegisterRequest;
import com.example.gmailapplication.shared.UserDto;

import okhttp3.ResponseBody;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.Header;
import retrofit2.http.POST;
import retrofit2.http.Path;

public interface UserAPI {

    @POST("users/register")
    Call<UserDto> register(@Body RegisterRequest request);

    @POST("users/login")
    Call<LoginResponse> login(@Body LoginRequest request);

    @GET("users/me")
    Call<UserDto> getCurrentUser(@Header("Authorization") String authToken);

    @GET("users/avatar/{userId}")
    Call<ResponseBody> getAvatar(@Path("userId") String userId);

    @GET("users/avatar-by-email/{email}")
    Call<ResponseBody> getAvatarByEmail(@Path("email") String email);

}