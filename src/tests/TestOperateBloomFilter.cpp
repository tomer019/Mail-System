#include "BloomFilter.h"
#include "HashFunction.h"
#include "HashStd.h"
#include <gtest/gtest.h>
#include <memory>
#include <fstream>
#include <cstdio>  // For std::remove to delete test files

// A test fixture class for BloomFilter-related tests.
class BloomFilterTest : public ::testing::Test {
protected:
    std::string test_filename = "test_filter.dat";  // File name used for test I/O

    // Runs after each test
    void TearDown() override {
        std::remove(test_filename.c_str());  // Clean up test file after test ends
    }

    // Returns a simple hash function list (used in all tests)
    std::vector<std::shared_ptr<HashFunction>> getBasicHash() {
        return { std::make_shared<HashStd>() };
    }
};

// Tests that loading from a missing file results in an empty initialized Bloom Filter
TEST_F(BloomFilterTest, HandlesMissingFileGracefully) {
std::remove(test_filename.c_str()); // Ensure the file doesn't exist before the test

BloomFilter filter(0, {});  // Create an empty filter
bool result = filter.load_from_file(test_filename, getBasicHash());

EXPECT_FALSE(result); // Should return false (file was missing)
EXPECT_FALSE(filter.possiblyContains("www.example.com")); // Should be empty
}

// Tests that saving and then loading a Bloom Filter preserves the bit state correctly
TEST_F(BloomFilterTest, SavesAndLoadsCorrectly) {
// Step 1: Create a filter and add a URL
BloomFilter original(256, getBasicHash());
std::string url = "www.example.com";
original.add(url);
original.save_to_file(test_filename);

// Load the filter into a new object
BloomFilter loaded(0, {});
bool success = loaded.load_from_file(test_filename, getBasicHash());

// Check that load succeeded and the filter recognizes the URL
EXPECT_TRUE(success);
EXPECT_TRUE(loaded.possiblyContains(url));
}

// Tests that a corrupted file causes the filter to reset safely
TEST_F(BloomFilterTest, HandlesCorruptedFileGracefully) {
// Step 1: Create a corrupted file with only partial data
{
std::ofstream out(test_filename, std::ios::binary);
size_t fake_size = 256;
out.write(reinterpret_cast<const char*>(&fake_size), sizeof(size_t));
// Do NOT write the bit array
}

//Attempt to load the corrupted file
BloomFilter filter(0, {});
bool result = filter.load_from_file(test_filename, getBasicHash());

//Check that loading failed and filter is empty
EXPECT_FALSE(result);
EXPECT_FALSE(filter.possiblyContains("www.example.com"));
}

