package com.example.gmailapplication.API;

import android.content.Context;
import android.os.Build;

import com.example.gmailapplication.shared.Label;
import com.example.gmailapplication.shared.LabelDeserializer;
import com.example.gmailapplication.shared.TokenManager;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

import okhttp3.Interceptor;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public final class BackendClient {
    private static volatile Retrofit INSTANCE;

    private static String getServerUrl() {
        return "http://10.0.2.2:3000/api/";
    }

    public static Retrofit get(Context ctx) {
        if (INSTANCE == null) {
            synchronized (BackendClient.class) {
                if (INSTANCE == null) {
                    OkHttpClient ok = new OkHttpClient.Builder().connectTimeout(60, TimeUnit.SECONDS)
                            .readTimeout(60, TimeUnit.SECONDS)
                            .writeTimeout(90, TimeUnit.SECONDS)
                            .addInterceptor(new Interceptor() {
                                @Override
                                public Response intercept(Chain chain) throws IOException {
                                    Request original = chain.request();
                                    String jwt = TokenManager.load(ctx);

                                    System.out.println("=== REQUEST DEBUG ===");
                                    System.out.println("URL: " + original.url());
                                    System.out.println("Method: " + original.method());
                                    System.out.println("Token exists: " + (jwt != null && !jwt.isEmpty()));
                                    if (jwt != null && !jwt.isEmpty()) {
                                        System.out.println("Token preview: " + jwt.substring(0, Math.min(20, jwt.length())) + "...");
                                        System.out.println("Full token length: " + jwt.length());
                                    }
                                    System.out.println("=====================");

                                    Request.Builder rb = original.newBuilder();
                                    if (jwt != null && !jwt.isEmpty()) {
                                        String authHeader = "Bearer " + jwt;
                                        rb.header("Authorization", authHeader);
                                        System.out.println("Added Authorization header: " + authHeader.substring(0, Math.min(30, authHeader.length())) + "...");
                                    }

                                    try {
                                        Request finalRequest = rb.build();
                                        System.out.println("Final request headers: " + finalRequest.headers());

                                        Response response = chain.proceed(finalRequest);
                                        System.out.println("=== RESPONSE DEBUG ===");
                                        System.out.println("Response code: " + response.code());
                                        System.out.println("Response message: " + response.message());

                                        // Check if it's an image or JSON
                                        String contentType = response.header("Content-Type", "");
                                        System.out.println("Content-Type: " + contentType);

                                        if (contentType.startsWith("image/")) {
                                            // For images - don't read content as String as it corrupts data
                                            System.out.println("=== IMAGE RESPONSE ===");
                                            System.out.println("Content-Length: " + response.header("Content-Length"));
                                            System.out.println("Image type: " + contentType);
                                            System.out.println("Passing image data without modification");
                                            System.out.println("======================");
                                        } else {
                                            // For JSON/text - read content for debugging
                                            String responseBodyString = null;
                                            try {
                                                if (response.body() != null) {
                                                    ResponseBody responseBody = response.body();
                                                    responseBodyString = responseBody.string();
                                                    System.out.println("=== JSON RESPONSE BODY ===");
                                                    System.out.println("Body length: " + responseBodyString.length());
                                                    System.out.println("Body content: " + responseBodyString);
                                                    System.out.println("==========================");

                                                    // Create new ResponseBody as we read the original
                                                    MediaType mediaType = responseBody.contentType();
                                                    ResponseBody newBody = ResponseBody.create(mediaType, responseBodyString);
                                                    response = response.newBuilder().body(newBody).build();
                                                } else {
                                                    System.out.println("=== NO RESPONSE BODY ===");
                                                }
                                            } catch (Exception e) {
                                                System.out.println("Error reading response body: " + e.getMessage());
                                                e.printStackTrace();
                                            }
                                        }

                                        // If there's a 401 error, print additional details
                                        if (response.code() == 401) {
                                            System.out.println("*** 401 UNAUTHORIZED DEBUG ***");
                                            System.out.println("Request URL: " + finalRequest.url());
                                            System.out.println("Authorization header exists: " + (finalRequest.header("Authorization") != null));
                                            if (finalRequest.header("Authorization") != null) {
                                                String authHeaderValue = finalRequest.header("Authorization");
                                                System.out.println("Auth header starts with 'Bearer ': " + (authHeaderValue != null && authHeaderValue.startsWith("Bearer ")));
                                            }
                                        }

                                        System.out.println("======================");
                                        return response;
                                    } catch (Exception e) {
                                        System.out.println("=== NETWORK ERROR ===");
                                        System.out.println("Error: " + e.getMessage());
                                        System.out.println("Error type: " + e.getClass().getSimpleName());
                                        System.out.println("====================");
                                        throw e;
                                    }
                                }
                            }).build();

                    // Create simple Gson without custom deserializers
                    Gson gson = new GsonBuilder()
                            .setLenient() // Allows non-strict JSON
                            .create();

                    INSTANCE = new Retrofit.Builder()
                            .baseUrl(getServerUrl())
                            .client(ok)
                            .addConverterFactory(GsonConverterFactory.create(gson))
                            .build();
                }
            }
        }
        return INSTANCE;
    }

    private BackendClient() {}
}