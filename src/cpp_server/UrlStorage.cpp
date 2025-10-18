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

// Removes a URL from the vector and updates the file and tells if it was successful
std::string UrlStorage::remove(const std::string& url) {
    std::ifstream in(file_path);
    if (!in.is_open()) { // Check if file can be opened
        return "400 Bad Request\n"; // File not found
    }
    std::string line; // current line we are reading
    std::vector<std::string> notDeletedLines; // vector to store lines that shouldn't be deleted
    bool found = false; // Flag to check if URL was found
    while (std::getline(in, line)) { // Read each line from the file
        if (line == url) { // If the URL matches
            found = true; // Set found flag
        } else {
            notDeletedLines.push_back(line); // Store lines that are not deleted
        }
    }
    in.close(); // Close the input file so we could open it later in write mode
    if (!found) { // If URL was not found
        return "404 Not Found\n"; // Return not found message
    }
    std::ofstream out(file_path, std::ios::trunc); // Open file in write mode
    if (!out.is_open()) { // Check if file can be opened
        return "400 Bad Request\n"; // File not found
    }
    for (const std::string& l : notDeletedLines) { // Write back the lines that are not deleted
        out << l << "\n"; // Write each line to the file
    }
    out.close(); // Close the output file
    reload(); // Reload the URLs from the file
    return "204 No Content\n"; // Return success message
}
