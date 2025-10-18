#include "gtest/gtest.h"
#include "BloomFilter.h"
#include "HashFunction.h" // Include the header for the HashFunction interface
#include "HashDouble.h"  // Include the header for the HashDouble class
#include "HashFunction.h"  // Include the header for the HashFunction class

// This test case verifies the behavior of the BloomFilter when checking for a URL
// that has not been added to the filter. It ensures that the BloomFilter correctly
// returns false for such cases, which is referred to as a "true negative."

TEST(BloomFilterTest, ReturnsFalseForNotAddedURL) {

    // Arrange
    // Create a shared pointer to a simple hash function (e.g., std::hash<std::string>).
    // This hash function will be used by the BloomFilter.
   auto hashFn = std::make_shared<HashDouble>();

   // Create an instance of the BloomFilter with a bit array size of 128
    // and a single hash function (provided in a vector).
    // The BloomFilter constructor requires the size of the bit array and a vector of hash functions.
    // The hash function is passed as a shared pointer to the BloomFilter.
   BloomFilter bloomFilter(128, {hashFn});

   // Define a URL that has not been added to the BloomFilter.
   std::string notInsertedUrl = "https://example.com/not-inserted";

    // Act
    // Check if the BloomFilter reports that the URL is possibly contained.
    bool result = bloomFilter.possiblyContains(notInsertedUrl);

    // Assert
    // Verify that the BloomFilter returns false for the URL that was never added.
    // This ensures that the BloomFilter behaves correctly for a "true negative" case.
    EXPECT_FALSE(result) << "BloomFilter should return false for URL that was never added";
}