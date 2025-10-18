package com.example.gmailapplication.shared;

import com.google.gson.annotations.JsonAdapter;
import com.google.gson.JsonDeserializer;
import com.google.gson.JsonElement;
import com.google.gson.JsonDeserializationContext;
import java.lang.reflect.Type;
import java.util.List;

import androidx.room.Entity;
import androidx.room.PrimaryKey;
import androidx.room.TypeConverters;
import com.example.gmailapplication.data.converters.StringListConverter;

import androidx.annotation.NonNull; // Use this

@Entity(tableName = "emails")
@TypeConverters({StringListConverter.class})

public class Email {
    @PrimaryKey
    @NonNull
    public String id;
    @JsonAdapter(FlexibleStringDeserializer.class)
    public String sender;
    @JsonAdapter(FlexibleStringDeserializer.class)
    public String recipient;
    public List<String> recipients;
    public String subject;
    public String content;
    public String timestamp;
    public List<String> labels;
    public String groupId;
    public boolean isDraft = false;

    public boolean hasLabel(String labelName) {
        return labels != null && labels.contains(labelName);
    }

    // Custom deserializer that handles both string and object
    public static class FlexibleStringDeserializer implements JsonDeserializer<String> {
        @Override
        public String deserialize(JsonElement json, Type typeOfT, JsonDeserializationContext context) {
            if (json.isJsonPrimitive()) {
                return json.getAsString();
            } else if (json.isJsonObject() && json.getAsJsonObject().has("email")) {
                return json.getAsJsonObject().get("email").getAsString();
            }
            return null;
        }
    }
}