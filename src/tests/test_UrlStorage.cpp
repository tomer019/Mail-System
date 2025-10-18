#include "gtest/gtest.h"
#include "UrlStorage.h"
#include <fstream>
#include <vector>

void writeTestFile(const std::string& path, const std::vector<std::string>& urls) {
    std::ofstream out(path);
    for (const auto& url : urls) {
        out << url << "\n";
    }
}

TEST(UrlStorageTest, ContainsAndReload) {
    writeTestFile("test_urls.txt", {"www.example.com0", "www.test.com"});
    UrlStorage storage("test_urls.txt");

    EXPECT_TRUE(storage.contains("www.example.com0"));
    EXPECT_FALSE(storage.contains("www.notadded.com"));

    writeTestFile("test_urls.txt", {"www.updated.com"});
    storage.reload();
    EXPECT_TRUE(storage.contains("www.updated.com"));
    EXPECT_FALSE(storage.contains("www.example.com0"));
}

TEST(UrlStorageTest, RemoveSuccessAndFail) {
    writeTestFile("test_urls.txt", {"www.to.delete", "www.keep.com"});
    UrlStorage storage("test_urls.txt");

    EXPECT_EQ(storage.remove("www.to.delete"), "204 No Content\n");
    EXPECT_FALSE(storage.contains("www.to.delete"));

    EXPECT_EQ(storage.remove("www.not.exist"), "404 Not Found\n");
}