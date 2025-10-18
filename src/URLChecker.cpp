#include "URLChecker.h"
#include "UrlStorage.h"
#include "BloomFilter.h"
#include <string>
#include <iostream>

// Determines the output string based on URL presence in BloomFilter and UrlStorage
std::string UrlChecker::outputString(const std::string& url, BloomFilter& bloom, UrlStorage& storage) {
    std::string result = "200 Ok\n\n"; // Default response header
    // Check if the URL is possibly in the BloomFilter
    if (!bloom.possiblyContains(url)) {
        return result  + "false"; // URL is definitely not present
    } else {
        // Check if the URL is confirmed in UrlStorage
        storage.reload(); // Reload the storage to ensure it's up-to-date
        return result  + (storage.contains(url) ? "true true" : "true false");
    }
}