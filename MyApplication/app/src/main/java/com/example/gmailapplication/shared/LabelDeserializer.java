package com.example.gmailapplication.shared;

import com.google.gson.*;
import java.lang.reflect.Type;
public class LabelDeserializer implements JsonDeserializer<Label> {
    @Override
    public Label deserialize(JsonElement json, Type typeOfT, JsonDeserializationContext context)
            throws JsonParseException {

        if (json.isJsonPrimitive()) {
            // If server returns only label ID
            return new Label(json.getAsString(), json.getAsString());
        } else if (json.isJsonObject()) {
            // If server returns full object
            JsonObject obj = json.getAsJsonObject();
            Label label = new Label();

            if (obj.has("id")) {
                label.id = obj.get("id").getAsString();
            }
            if (obj.has("name")) {
                label.name = obj.get("name").getAsString();
            }

            return label;
        }

        return new Label("unknown", "unknown");
    }
}