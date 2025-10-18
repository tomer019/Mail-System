package com.example.gmailapplication.shared;

import java.util.List;

public class SendEmailRequest {
    public String sender;
    public String recipient;
    public List<String> recipients;
    public String subject;
    public String content;
    public List<String> labels; // List of labels as objects
}