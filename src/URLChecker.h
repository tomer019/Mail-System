#ifndef URLCHECKER_H
#define URLCHECKER_H

#include <string>

// Forward declarations for BloomFilter and UrlStorage classes
class BloomFilter;
class UrlStorage;

// UrlChecker class provides a static method to determine URL presence
class UrlChecker {
public: // Returns a string indicating the presence of a URL in BloomFilter and UrlStorage
    static std::string outputString(const std::string& url, BloomFilter& bloom, UrlStorage& storage);
};

#endif // URLCHECKER_H
