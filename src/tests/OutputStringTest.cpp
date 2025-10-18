#include <fstream>
#include "gtest/gtest.h"
#include "BloomFilter.h"
#include "UrlStorage.h"
#include "HashStd.h"
#include "HashDouble.h"
#include "URLChecker.h"

TEST(UrlCheckerTest, OutputStringLogic) {
    std::vector<std::shared_ptr<HashFunction>> hashFuncs = {
        std::make_shared<HashStd>(),
        std::make_shared<HashDouble>()
    };

    BloomFilter bloom(128, hashFuncs);
    UrlStorage storage("data/test_urls.txt");

    // Ensure file is clean
    std::ofstream clear("data/test_urls.txt", std::ios::trunc);
    clear << "https://real.url.com\n";
    clear.close();

    bloom.add("https://real.url.com");

    // true + true
    EXPECT_EQ(UrlChecker::outputString("https://real.url.com", bloom, storage), "true true");

    // true + false (false positive)
    std::string maybe = "https://maybe.false.com";
    bloom.add(maybe); // intentionally no write to file
    EXPECT_EQ(UrlChecker::outputString(maybe, bloom, storage), "true false");

    // false
    std::string definitelyNot = "https://nope.com";
    EXPECT_EQ(UrlChecker::outputString(definitelyNot, bloom, storage), "false");
}