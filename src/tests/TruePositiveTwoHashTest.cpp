#include "gtest/gtest.h"
#include "BloomFilter.h"
#include "HashStd.h"  // Include the standard hash function implementation
#include "HashDouble.h"  // Include the double hash function implementation

// This test case verifies the behavior of the BloomFilter when using two hash functions.
// It ensures that the BloomFilter correctly identifies a URL that was added to it
// as possibly contained, demonstrating a "true positive" result.

TEST(BloomFilterTest, TruePositiveWithTwoHashFunctions) {
    // Arrange
    // Create shared pointers to two different hash functions.
    auto hash1 = std::make_shared<HashStd>();
    auto hash2 = std::make_shared<HashDouble>();

    // Create an instance of the BloomFilter with a bit array size of 128
    // and two hash functions (provided in a vector).
    BloomFilter bloomFilter(128, {hash1, hash2});

    // Define a URL to be added to the BloomFilter.
    std::string url = "https://combined-hash.com";

    // Act
    // Add the URL to the BloomFilter.
    bloomFilter.add(url);
    // Check if the BloomFilter reports that the URL is possibly contained.
    bool result = bloomFilter.possiblyContains(url);

    // Assert
    // Verify that the BloomFilter returns true for the URL that was added.
    // This ensures that the BloomFilter behaves correctly when using multiple hash functions.
    EXPECT_TRUE(result) << "BloomFilter should return true for URL added using multiple hash functions";
}
