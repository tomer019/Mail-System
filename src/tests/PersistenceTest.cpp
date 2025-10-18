// PersistenceTest.cpp
// A separate test suite for persisting and loading BloomFilter state

#include "gtest/gtest.h"
#include "BloomFilter.h"
#include "HashStd.h"

#include <cstdio>
#include <fstream>

/**
 * Test fixture for BloomFilter persistence behavior.
 */
class PersistenceTest : public ::testing::Test {
protected:
    const std::string filename = "test_state.bin";

    void TearDown() override {
        // Remove any test file left over
        std::remove(filename.c_str());
    }
};

// 1) Missing file -> false + empty filter
TEST_F(PersistenceTest, MissingFileReturnsFalseAndLeavesEmptyFilter) {
    BloomFilter bf(64, {std::make_shared<HashStd>()});
    bool ok = bf.loadFromFile(filename);
    EXPECT_FALSE(ok);
    EXPECT_FALSE(bf.possiblyContains("anything"));
}

// 2) Save then load restores bits
TEST_F(PersistenceTest, SaveAndLoadRestoresBits) {
    const size_t SIZE = 128;
    auto hash = std::make_shared<HashStd>();
    BloomFilter writer(SIZE, {hash});
    writer.add("hello");
    writer.add("world");
    ASSERT_TRUE(writer.saveToFile(filename));

    BloomFilter reader(SIZE, {hash});
    EXPECT_FALSE(reader.possiblyContains("hello"));
    bool loaded = reader.loadFromFile(filename);
    EXPECT_TRUE(loaded);
    EXPECT_TRUE(reader.possiblyContains("hello"));
    EXPECT_TRUE(reader.possiblyContains("world"));
    EXPECT_FALSE(reader.possiblyContains("absent"));
}

// 3) Corrupted file -> false + empty filter
TEST_F(PersistenceTest, CorruptedFileReturnsFalseAndLeavesEmpty) {
    // Write invalid data
    std::ofstream out(filename, std::ios::binary);
    out << "invalid data";
    out.close();

    BloomFilter bf(32, {std::make_shared<HashStd>()});
    bool ok = bf.loadFromFile(filename);
    EXPECT_FALSE(ok);
    EXPECT_FALSE(bf.possiblyContains("hello"));
}

// Optional main if not linked elsewhere
int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
