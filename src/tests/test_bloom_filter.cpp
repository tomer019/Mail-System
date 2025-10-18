#include "BloomFilter.h"
#include "HashStd.h"
#include "HashDouble.h"

#include <iostream>
#include <memory>

int main() {
    std::cout << "Running Bloom Filter tests...\n" << std::endl;

    std::vector<std::shared_ptr<HashFunction>> hash_funcs = {
        std::make_shared<HashStd>(),
        std::make_shared<HashDouble>()
    };

    BloomFilter filter(128, hash_funcs);

    std::string url1 = "www.example.com";
    std::string url2 = "www.notadded.com";

    // URL was added - should return true
    filter.add(url1);
    if (filter.possiblyContains(url1)) {
        std::cout << "Test 1 passed: added URL was found" << std::endl;
    } else {
        std::cout << "Test 1 failed: added URL not found" << std::endl;
    }

    // URL not added - should return false (or maybe true if false positive)
    bool result2 = filter.possiblyContains(url2);
    std::cout << "Test 2 (not added): "
              << (result2 ? "Maybe in filter (false positive)" : "Definitely not in filter")
              << std::endl;

    // Check that hash functions give different results
    size_t std_result = HashStd{}(url1) % 128;
    size_t double_result = HashDouble{}(url1) % 128;

    if (std_result != double_result) {
        std::cout << "Test 3 passed: hash functions returned different indexes" << std::endl;
    } else {
        std::cout << "Test 3 warning: hash functions returned same index" << std::endl;
    }

    std::cout << "\n All tests completed.\n" << std::endl;
    return 0;
}
