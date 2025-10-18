#include "gtest/gtest.h"
#include "URLChecker.h"
#include "BloomFilter.h"
#include "UrlStorage.h"
#include "HashStd.h"
#include <fstream>
#include <memory>

void prepareURLFile(const std::string& filename, const std::vector<std::string>& urls) {
    std::ofstream out(filename);
    for (const auto& url : urls) {
        out << url << "\n";
    }
}

TEST(URLCheckerTest, OutputStringCases) {
    BloomFilter bf(8, {std::make_shared<HashStd>()});
    bf.add("www.example.com0");

    prepareURLFile("test_urls_checker.txt", {"www.example.com0"});
    UrlStorage storage("test_urls_checker.txt");

    std::string response = UrlChecker::outputString("www.example.com0", bf, storage);
    EXPECT_EQ(response, "200 Ok\n\ntrue true");

    response = UrlChecker::outputString("www.notadded.com", bf, storage);
    EXPECT_EQ(response, "200 Ok\n\nfalse");

    response = UrlChecker::outputString("www.falsepositive.com", bf, storage);
    ASSERT_TRUE(response == "200 Ok\n\nfalse" || response == "200 Ok\n\ntrue false");
}