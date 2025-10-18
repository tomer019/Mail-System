#include "gtest/gtest.h"
#include <filesystem>
#include <fstream>
#include "BloomFilter.h"
#include "HashStd.h"
#include "HashDouble.h"
#include "UrlStorage.h"

#include <memory>

TEST(BloomFilterTest, DetectsFalsePositiveUsingUrlStorage) {
    // Step 1: Create a Bloom Filter with 2 hash functions
    std::vector<std::shared_ptr<HashFunction>> hash_funcs = {
        std::make_shared<HashStd>(),
        std::make_shared<HashDouble>()
    };

    BloomFilter filter(128, hash_funcs);

    std::string insertedUrl = "https://example.com/added";
    std::string notInsertedUrl = "https://example.com/not-added";
    std::string falsePositivedUrl = "https://example.com/false-positive";

    // Step 2: add false positive URL to the filter without adding to UrlStorage
    std::filesystem::remove("data/test_urls.txt"); // Clear the file for testing
    filter.add(falsePositivedUrl);

    // Step 2: Add only the first URL
    filter.add(insertedUrl);

    // Step 3: Run Bloom Filter check on a different URL
    bool bloomResult = filter.possiblyContains(notInsertedUrl);

    if (bloomResult) {
        // Step 4: Check against real blacklist using UrlStorage
        UrlStorage storage("data/urls.txt");
        bool reallyExists = storage.contains(notInsertedUrl);

        EXPECT_FALSE(reallyExists)
            << "False positive detected: BloomFilter returned true but URL not found in real blacklist";
    } else {
        SUCCEED() << "Correct behavior: BloomFilter returned false for URL not added";
    }
}
