#include "UrlStorage.h"
#include <fstream>
#include <iostream>

// Constructor: initializes file path and loads URLs from the file
UrlStorage::UrlStorage(const std::string& filepath) {
    file_path = filepath;
    loadFromFile();
}

// Loads URLs from the file into the vector
void UrlStorage::loadFromFile() {
    urls.clear(); // Clear existing URLs
    std::ifstream in(file_path);
    if (!in.is_open()) { // Check if file can be opened
        std::cout << "Could not open " << file_path << std::endl;
        return;
    }
    std::string line;
    while (std::getline(in, line)) { // Read each line from the file
        if (!line.empty()) { // Ignore empty lines
            urls.push_back(line); // Add URL to the vector
        }
    }
}

// Reloads URLs by re-reading the file
void UrlStorage::reload() {
    loadFromFile();
}

// Checks if a URL exists in the vector
bool UrlStorage::contains(const std::string& url) const {
    for (const auto& u : urls) { // Iterate through stored URLs
        if (u == url) { // Compare with the given URL
            return true; // URL found
        }
    }
    return false; // URL not found
}