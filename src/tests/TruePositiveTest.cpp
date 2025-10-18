#include "gtest/gtest.h"
#include "BloomFilter.h"
#include "HashFunction.h" // Include the header for the HashFunction interface
#include "HashDouble.h"  // Include the header for the HashDouble class

// This test verifies the functionality of the BloomFilter class.
// Specifically, it checks whether the BloomFilter correctly identifies
// that an element (URL) that was added to it is possibly contained within it.

TEST(BloomFilterTest, TruePositive) {
    // Arrange
    // Create an instance of the BloomFilter class.
    // If the BloomFilter constructor requires parameters (e.g., size, hash functions),
    // make sure to provide them here.
    BloomFilter bloomFilter = BloomFilter(128, {std::make_shared<HashDouble>()});  
    std::string url = "https://example.com";  // Define a sample URL to test.

    // Act
    // Add the URL to the BloomFilter.
    bloomFilter.add(url);
    // Check if the BloomFilter reports that the URL is possibly contained.
    bool result = bloomFilter.possiblyContains(url);

    // Assert
    // Verify that the BloomFilter returns true for the URL that was added.
    // This ensures that the BloomFilter behaves as expected for a "true positive" case.
    EXPECT_TRUE(result) << "BloomFilter should return true for an inserted URL";
}