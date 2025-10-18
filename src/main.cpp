#include <iostream>
#include <string>
#include <filesystem>      // for std::filesystem::exists()
#include "bloom_setup.h"
#include "BloomFilter.h"
#include "HashStd.h"
#include "HashDouble.h"
#include "URLChecker.h"
#include "UrlStorage.h"
#include "UrlListUtils.h"
#include <filesystem>
#include <sstream>

// Splits a line of input into arguments
std::vector<std::string> splitArguments(const std::string& line) {
    std::stringstream ss(line);
    std::vector<std::string> args;
    std::string arg;

    while (ss >> arg) {
        args.push_back(arg); // Add each argument to the vector
    }

    return args;
}

static constexpr char STATE_FILE[] = "data/bloom_state.bin"; // File to save BloomFilter state

int main() {
    // Prompt for configuration
    std::string line;
    std::getline(std::cin, line);

    // Create BloomFilter from configuration
    BloomFilter bf = createFromConfigLine(line);
    UrlStorage storage("data/urls.txt");

    // Check for an existing state file
    if (std::filesystem::exists(STATE_FILE)) {
        // Attempt to load it
        bf.loadFromFile(STATE_FILE);
    }

    // Main loop for processing commands
    while (true) {
        std::string input, url;
        int cmd;
        std::getline(std::cin, input); // Read user input
        auto splitInput = splitArguments(input); // Split input into command and URL
        try {
            cmd = std::stoi(splitInput[0]); // Convert command to integer
        } catch (const std::invalid_argument& e) {
            continue; // Skip invalid commands to next iteration
        }
        if (splitInput.size() != 2) {
            continue; // Ensure input has exactly two parts
        }
        url = splitInput[1]; // Extract URL
        if (UrlListUtils::is_valid_url(url) == false) {
            continue; // Skip invalid URLs
        }

        if (cmd == 1) { // Add URL to BloomFilter
            bf.add(url);
            // Save immediately after each update
            bf.saveToFile(STATE_FILE);

        }
        if (cmd == 2) { // Check URL presence in BloomFilter and UrlStorage
            std::cout << UrlChecker::outputString(url, bf, storage) << "\n";

        } 
    }

    return 0;
}
