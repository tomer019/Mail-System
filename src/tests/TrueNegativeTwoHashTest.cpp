#include "gtest/gtest.h"
#include "BloomFilter.h"
#include "HashStd.h"  // Include the standard hash function implementation
#include "HashDouble.h"  // Include the double hash function implementation

// This test case verifies the behavior of the BloomFilter when using two hash functions
// and checking for a URL that has not been added to the filter. It ensures that the
// BloomFilter correctly returns false for such cases, demonstrating a "true negative" result.

TEST(BloomFilterTest, TrueNegativeWithTwoHashFunctions) {
    // Arrange
    // Create shared pointers to two different hash functions.
    auto hash1 = std::make_shared<HashStd>();
    auto hash2 = std::make_shared<HashDouble>();

    // Create an instance of the BloomFilter with a bit array size of 128
    // and two hash functions (provided in a vector).
    BloomFilter bloomFilter(128, {hash1, hash2});

    // Define a URL that has not been added to the BloomFilter.
    std::string url = "https://not-added.com";

    // Act
    // Check if the BloomFilter reports that the URL is possibly contained.
    bool result = bloomFilter.possiblyContains(url);

    // Assert
    // Verify that the BloomFilter returns false for the URL that was never added.
    // This ensures that the BloomFilter behaves correctly when using multiple hash functions.
    EXPECT_FALSE(result) << "BloomFilter should return false for URL not added, even with multiple hash functions";
}