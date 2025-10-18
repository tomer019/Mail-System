#include "BloomFilter.h"
#include "HashStd.h"
#include "HashDouble.h"
#include <iostream>
#include <cassert>
#include <memory>

// Declaration of the function that builds a BloomFilter from a configuration line
BloomFilter createFromConfigLine(const std::string& line);

// Test 1: Valid configuration line
void test_valid_input() {
    BloomFilter bf = createFromConfigLine("256 std double");
    std::cout << "Test 1: valid input ";
    assert(bf.possiblyContains("www.test.com") == false);
    std::cout << "PASSED\n";
}

// Test 2: Invalid size field
void test_invalid_size() {
    BloomFilter bf = createFromConfigLine("abc std");
    std::cout << "Test 2: invalid size ";
    assert(bf.possiblyContains("example.com") == false);
    std::cout << "PASSED\n";
}

// Test 3: Unknown hash function name
void test_unknown_hash() {
    BloomFilter bf = createFromConfigLine("128 unknown");
    std::cout << "Test 3: unknown hash type ";
    assert(bf.possiblyContains("site.com") == false);
    std::cout << "PASSED\n";
}

// Test 4: Empty configuration line
void test_empty_line() {
    BloomFilter bf = createFromConfigLine("");
    std::cout << "Test 4: empty line ";
    assert(bf.possiblyContains("empty.com") == false);
    std::cout << "PASSED\n";
}

int main() {
    std::cout << "== Configuration Tests ==\n";
    test_valid_input();
    test_invalid_size();
    test_unknown_hash();
    test_empty_line();
    std::cout << "All tests passed\n";
    return 0;
}
