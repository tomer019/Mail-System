#include "InfiniteCommandLoop.h"
#include <iostream>
#include <string>
#include <filesystem> // for std::filesystem::exists()
#include "bloom_setup.h"
#include "BloomFilter.h"
#include "HashStd.h"
#include "HashDouble.h"
#include "URLChecker.h"
#include "UrlStorage.h"
#include "UrlListUtils.h"
#include "TCP_Server.h"
#include <sstream>
#include <unistd.h>

InfiniteCommandLoop::InfiniteCommandLoop(int client_fd, BloomFilter* filter, std::mutex* filter_mutex)
    : client_fd(client_fd), filter(filter), filter_mutex(filter_mutex) {}

void InfiniteCommandLoop::run() {
    UrlStorage storage("data/urls.txt");

    // Check for an existing state file
    if (std::filesystem::exists(STATE_FILE))
    {
        // Attempt to load it
        std::lock_guard<std::mutex> lock(*filter_mutex);
        filter->loadFromFile(STATE_FILE);
    }

    // Main loop for processing commands
    while (true) {
        std::string input = receiveLine(); // Receive input from the server
        if (input.empty()) {
            sendMessage("400 Bad Request\n"); // Handle empty input
            break; // Exit loop if no input received
        }

        auto splitInput = splitArguments(input); // Split input into command and URL
        if (splitInput.size() != 2) {
            sendMessage("400 Bad Request\n"); // Ensure input has exactly two parts
            continue;
        }

        std::string cmd = splitInput[0];
         std::string url = splitInput[1]; // Extract URL

        if (!UrlListUtils::is_valid_url(url)) {
            sendMessage("400 Bad Request\n"); // Skip invalid URLs
            continue;
        }

        if (cmd == "POST") { // Add URL to BloomFilter
            std::lock_guard<std::mutex> lock(*filter_mutex);
            filter->add(url);
            // Save immediately after each update
            filter->saveToFile(STATE_FILE);
            sendMessage("201 Created\n");
        }
        else if (cmd == "GET") {
            // Check URL presence in BloomFilter and UrlStorage
            std::lock_guard<std::mutex> lock(*filter_mutex);
            sendMessage(UrlChecker::outputString(url, *filter, storage) + "\n");
        }
        else if (cmd == "DELETE")
        { // Remove URL from BloomFilter
            sendMessage(storage.remove(url));
        }
        else
        {
            sendMessage("400 Bad Request\n"); // Handle unknown commands
        }
    }
     close(client_fd);
}

std::string InfiniteCommandLoop::receiveLine() {
    std::string line;
    char ch;
    while (recv(client_fd, &ch, 1, 0) > 0) {
        if (ch == '\n') break;
        line += ch;
    }
    return line;
}

void InfiniteCommandLoop::sendMessage(const std::string& message) {
    send(client_fd, message.c_str(), message.size(), 0);
}

// Splits a line of input into arguments
std::vector<std::string> InfiniteCommandLoop::splitArguments(const std::string &line) {
    std::stringstream ss(line);
    std::vector<std::string> args;
    std::string arg;

    while (ss >> arg) {
        args.push_back(arg); // Add each argument to the vector
    }

    return args;
}
