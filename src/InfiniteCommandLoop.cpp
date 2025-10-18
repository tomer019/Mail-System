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

// Splits a line of input into arguments
std::vector<std::string> InfiniteCommandLoop::splitArguments(const std::string &line)
{
    std::stringstream ss(line);
    std::vector<std::string> args;
    std::string arg;

    while (ss >> arg)
    {
        args.push_back(arg); // Add each argument to the vector
    }

    return args;
}

/*std::string receiveLineBuffered(TCPServer& server) {
    static std::string buffer;  // saved between calls
    while (true) {
        size_t newlinePos = buffer.find('\n');
            // found a complete line
            std::string line = buffer.substr(0, newlinePos);
            buffer = buffer.substr(newlinePos + 1); // rest of the buffer
            return line;
        }

        // haven't found a complete line yet
        // receive more data
        std::string msg = server.receiveMessage();
        if (msg.empty()) {
            // error or connection closed
            return "";
        }

        buffer += msg;
    }
}*/

// static constexpr char STATE_FILE[] = "data/bloom_state.bin"; // File to save BloomFilter state

void InfiniteCommandLoop::loop(TCPServer &server, const std::string &config_line)
{
    /*// Prompt for configuration
    std::string line = server.receiveFirstLineBuffered(); // Receive configuration line from the server*/
    // Create BloomFilter from configuration
    BloomFilter bf = createFromConfigLine(config_line, server);
    //server.sendMessage("200 OK\n");
    UrlStorage storage("data/urls.txt");

    // Check for an existing state file
    if (std::filesystem::exists(STATE_FILE))
    {
        // Attempt to load it
        bf.loadFromFile(STATE_FILE);
    }

    // Main loop for processing commands
    while (true)
    {
        std::cout << "Welcome3 to the loop!\n"; // Send welcome message
        std::string cmd, input, url;
        // std::getline(std::cin, input);           // Read user input
        input = server.receiveLineBuffered(); // Receive input from the server
        if (input.empty())
        {
            server.sendMessage("400 Bad Request\n"); // Handle empty input
            continue;
        }
        auto splitInput = splitArguments(input); // Split input into command and URL
        if (splitInput.size() != 2)
        {
            server.sendMessage("400 Bad Request\n"); // Ensure input has exactly two parts
            continue;
        }
        std::cout << "Test A\n";
        cmd = splitInput[0];
        std::cout << "Test B\n";
        url = splitInput[1]; // Extract URL
        std::cout << "Test C\n";
        if (UrlListUtils::is_valid_url(url) == false)
        {
            server.sendMessage("400 Bad Request\n"); // Skip invalid URLs
            continue;
        }

        if (cmd == "POST")
        { // Add URL to BloomFilter
            bf.add(url);
            // Save immediately after each update
            bf.saveToFile(STATE_FILE);
            server.sendMessage("201 Created\n");
        }
        else if (cmd == "GET")
        { // Check URL presence in BloomFilter and UrlStorage
            server.sendMessage(UrlChecker::outputString(url, bf, storage) + "\n");
        }
        else if (cmd == "DELETE")
        { // Remove URL from BloomFilter
            server.sendMessage(storage.remove(url));
        }
        else
        {
            std::cout << "[DEBUG] Entered ELSE (unknown cmd)" << std::endl;
            server.sendMessage("400 Bad Request\n"); // Handle unknown commands
        }
    }
}
