#include <gtest/gtest.h>
#include <cstdio>
#include <set>
#include <string>
#include <fstream>
#include "UrlListUtils.h"


// Test fixture to handle setup/cleanup
class UrlListTest : public ::testing::Test {
protected:
    std::string test_filename = "test_urls.txt"; // Get file name used for testing

    void TearDown() override {
        std::remove(test_filename.c_str()); // Delete test file if it exists
    }
};

//Testing if the file doesn't exist, fallback to empty set
TEST_F(UrlListTest, HandlesMissingFile) {
std::remove(test_filename.c_str());  // Ensure file doesn't exist

std::set<std::string> urls;   // Create an empty set to hold URLs
bool result = UrlListUtils::load_url_list_from_file(test_filename, urls); // Try to load from a missing fil
EXPECT_FALSE(result);                // Should return false
EXPECT_TRUE(urls.empty());           // Set should be empty
}

// Test: load_url_list_from_file should correctly load URLs from a valid file
TEST_F(UrlListTest, LoadsValidUrlList) {
//Create a test file with valid URLs
{
std::ofstream out(test_filename);
out << "www.example.com\n";
out << "www.google.com\n";
}

//Attempt to load from that file
std::set<std::string> urls;
bool result = UrlListUtils::load_url_list_from_file(test_filename, urls);

// Verify result is true and both URLs were loaded
EXPECT_TRUE(result);
EXPECT_EQ(urls.size(), 2);
EXPECT_TRUE(urls.count("www.example.com") > 0);
EXPECT_TRUE(urls.count("www.google.com") > 0);
}

// Test: load_url_list_from_file should handle corrupted file gracefully
TEST_F(UrlListTest, HandlesCorruptedFileGracefully) {
// Write invalid data to the file (simulate corruption)
{
std::ofstream out(test_filename, std::ios::binary);
out.write("www.good-url.com\n\0\0\0\0\0\0\0", 25); // Mix of text and binary garbage
}

// Attempt to load the corrupted file
std::set<std::string> urls;
bool result = UrlListUtils::load_url_list_from_file(test_filename, urls);

// Expect the read to fail and the set to be cleared
EXPECT_FALSE(result);          // Should detect read failure
EXPECT_TRUE(urls.empty());     // Set should be cleared
}

