#ifndef URLSTORAGE_H
#define URLSTORAGE_H

#include <string>
#include <vector>

// Class to manage URL storage and lookup
class UrlStorage {
public:
    UrlStorage(const std::string& filepath); // Constructor: initializes with a file path
    bool contains(const std::string& url) const; // Checks if a URL exists in the storage
    void reload(); // Reloads the URLs from the file (if changed)
    std::string remove(const std::string& url); // Removes a URL from the storage and tells if it was successful

private:
    std::string file_path; // Path to the file storing URLs
    std::vector<std::string> urls; // Set of stored URLs

    void loadFromFile(); // Loads URLs from the file into the set
};

#endif