#include "gtest/gtest.h"
#include "BloomFilter.h"
#include "HashStd.h"
#include "HashDouble.h"
#include <memory>
#include <fstream>

// Helper to create a basic BloomFilter
BloomFilter makeSimpleFilter(size_t size = 8) {
    std::vector<std::shared_ptr<HashFunction>> hashes = {
        std::make_shared<HashStd>()
    };
    return BloomFilter(size, hashes);
}

TEST(BloomFilterTest, AddAndPossiblyContains) {
    BloomFilter bf = makeSimpleFilter();
    bf.add("www.example.com0");
    EXPECT_TRUE(bf.possiblyContains("www.example.com0"));
    EXPECT_FALSE(bf.possiblyContains("www.notadded.com"));
}

TEST(BloomFilterTest, SaveAndLoadPreservesState) {
    BloomFilter bf = makeSimpleFilter();
    bf.add("www.example.com0");
    bf.saveToFile("test_state.bin");

    BloomFilter loaded(8, { std::make_shared<HashStd>() });
    bool loaded_success = loaded.loadFromFile("test_state.bin");
    EXPECT_TRUE(loaded_success);
    EXPECT_TRUE(loaded.possiblyContains("www.example.com0"));
}

TEST(BloomFilterTest, SaveToBinaryAndLoadBinary) {
    BloomFilter bf = makeSimpleFilter();
    bf.add("www.example.com0");
    bf.save_to_file("test_state_compact.bin");

    BloomFilter bf2(8, { std::make_shared<HashStd>() });
    bool success = bf2.load_from_file("test_state_compact.bin", { std::make_shared<HashStd>() });
    EXPECT_TRUE(success);
    EXPECT_TRUE(bf2.possiblyContains("www.example.com0"));
}
