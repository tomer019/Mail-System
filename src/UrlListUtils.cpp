#include "UrlListUtils.h"     // Include our function declarations
#include <fstream>            // For file input/output streams
#include <iostream>           // For printing errors
#include <regex> // Include the <regex> library to use regular expressions

// Reads a list of URLs from a file into a set (each line is one URL)
bool UrlListUtils::load_url_list_from_file(const std::string& filename, std::set<std::string>& url_list) {
    std::ifstream infile(filename);  // Try to open the file for reading

    // If the file doesn't exist, clear the set and return failure
    if (!infile) {
        std::cerr << "[Info] URL list file not found. Using empty set." << std::endl;
        url_list.clear();
        return false;
    }

    std::string url;
    // Read the file line by line, inserting each URL into the set
    while (std::getline(infile, url)) {
        if (!url.empty())             // Ignore empty lines
            url_list.insert(url);     // Add non-empty URL to the set
    }

    // If reading failed before reaching the end of file, treat as corrupted
    if (!infile.eof()) {
        std::cerr << "[Error] URL list file read error. Using empty set." << std::endl;
        url_list.clear();            // Clear to avoid partial or invalid data
        return false;
    }

    return true;  // Successful load
}

//Checks whether the received URL is valid.
bool UrlListUtils::is_valid_url(const std::string& url) {
    // Define a regular expression for validating URLs:
    const std::regex url_regex(R"(^www\.[\w\-]+(\.[a-zA-Z0-9]{2,})(\/[\w\.\-~:\/?#\[\]@!$&'()+,;=])?$)");
    return std::regex_match(url, url_regex); // Return true if the entire string matches the pattern
}

// Writes a set of URLs to a file, one per line
void save_url_list_to_file(const std::string& filename, const std::set<std::string>& url_list) {
    std::ofstream outfile(filename);  // Open file for writing

    // If file couldn't be opened print error and skip writing
    if (!outfile) {
        std::cerr << "[Error] Could not open URL list file for writing." << std::endl;
        return;
    }

    // Write each URL on its own line
    for (const auto& url : url_list) {
        outfile << url << "\n";
    }
}
