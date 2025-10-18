package com.example.gmailapplication.data.converters;

import androidx.room.TypeConverter;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.lang.reflect.Type;
import java.util.List;

public class StringListConverter {
    @TypeConverter
    public static String fromStringList(List<String> value) {
        if (value == null) return null;
        return new Gson().toJson(value);
    }

    @TypeConverter
    public static List<String> fromString(String value) {
        if (value == null) return null;
        Type listType = new TypeToken<List<String>>() {}.getType();
        return new Gson().fromJson(value, listType);
    }
}