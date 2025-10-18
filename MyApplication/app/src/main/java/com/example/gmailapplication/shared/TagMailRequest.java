package com.example.gmailapplication.shared;

public class TagMailRequest {
    public String mailId;
    public String labelId;

    public TagMailRequest(String mailId, String labelId) {
        this.mailId = mailId;
        this.labelId = labelId;
    }
}