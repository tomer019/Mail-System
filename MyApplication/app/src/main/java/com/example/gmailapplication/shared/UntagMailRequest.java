package com.example.gmailapplication.shared;

public class UntagMailRequest {
    public String mailId;
    public String labelId;

    public UntagMailRequest(String mailId, String labelId) {
        this.mailId = mailId;
        this.labelId = labelId;
    }
}