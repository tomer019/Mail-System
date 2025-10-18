#ifndef BLOOMFILTER_H  
#define BLOOMFILTER_H

#include "HashFunction.h"            // Interface for hash functions
#include <vector>                    // For bit array and list of hash functions
#include <memory>                    // For std::shared_ptr
#include <string>                    // For std::string input

class BloomFilter {
    private:
        std::vector<bool> bit_array;   // The bit array representing the filter
        std::vector<std::shared_ptr<HashFunction>> hash_functions;  // List of hash functions
        size_t size;  // Total number of bits
    
    public:
        // Constructor: accepts bit array size and vector of hash functions
        BloomFilter(size_t size, std::vector<std::shared_ptr<HashFunction>> hash_funcs)
            : bit_array(size, false), hash_functions(std::move(hash_funcs)), size(size) {}
    
        void add(const std::string& url);
        bool possiblyContains(const std::string& url) const;
        // Loads the Bloom Filter state from a file.
        bool load_from_file(const std::string& filename, const std::vector<std::shared_ptr<HashFunction>>& hash_funcs);
        // Saves the current Bloom Filter state to a file.
        void save_to_file(const std::string& filename) const;
        // Initializes an empty Bloom Filter
        void initialize_empty_filter();
        bool saveToFile(const std::string& filename) const;
        bool loadFromFile(const std::string& filename);
    };
#endif