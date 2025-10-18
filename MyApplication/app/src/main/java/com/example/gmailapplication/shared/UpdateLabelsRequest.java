package com.example.gmailapplication.shared;

import java.util.List;

public class UpdateLabelsRequest {
    public List<String> labels;

    public UpdateLabelsRequest(List<String> labels) {
        this.labels = labels;
    }
}