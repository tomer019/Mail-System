#include "bloom_setup.h"
#include "HashStd.h"
#include "HashDouble.h"
#include <sstream>
#include <iostream>
#include <string>
#include <cctype>

// Creates a BloomFilter instance from a configuration line
BloomFilter createFromConfigLine(const std::string& line) {
    std::stringstream ss(line);
    std::vector<std::string> args;
    std::string part;

    // Split the input line into arguments
    while (ss >> part) {
        args.push_back(part);
    }
    
    // Validate the first argument (bit array size) is a positive integer
    while (!std::all_of(args[0].begin(), args[0].end(), ::isdigit)) {
        std::string newConfigLine;
        std::getline(std::cin, newConfigLine); // Prompt for valid input
        args.clear(); 
        std::stringstream ss(newConfigLine);
        while (ss >> part) {
            args.push_back(part);
        }
    }
    size_t bit_array_size = std::stoul(args[0]); // Convert to size_t

    // Ensure valid configuration: bit array size > 0 and correct number of arguments
    while (bit_array_size <= 0 || args.size() < 2 || args.size() > 3) {
        std::string newConfigLine;
        std::getline(std::cin, newConfigLine); // Prompt for valid input
        args.clear(); 
        std::stringstream ss(newConfigLine);
        while (ss >> part) {
            args.push_back(part);
        }
    }

    int hashStdCount = std::stoi(args[1]); // Number of standard hash functions
    int hashDoubleCount = 0;

    // Parse optional third argument (number of double hash functions)
    if (args.size() == 3) {
        hashDoubleCount = std::stoi(args[2]);
    }

    std::vector<std::shared_ptr<HashFunction>> hash_funcs;

    // Add standard hash functions to the vector
    for (int i = 0; i < hashStdCount; ++i) {
        hash_funcs.push_back(std::make_shared<HashStd>());
    }

    // Add double hash functions to the vector
    for (int i = 0; i < hashDoubleCount; ++i) {
        hash_funcs.push_back(std::make_shared<HashDouble>());
    }

    // Create and return the BloomFilter instance with the specified size and hash functions
    return BloomFilter(bit_array_size, hash_funcs);
}
