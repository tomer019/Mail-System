#include "BloomFilter.h"
#include <fstream>
#include <iostream>
#include <cstdint>
#include <string>
#include <vector>
#include <stdexcept>


// Adds a string (URL) to the Bloom Filter and saves to file
void BloomFilter::add(const std::string& url) {
    for (const auto& hash : hash_functions) {
        size_t idx = (*hash)(url) % size;
        bit_array[idx] = true;
    }
    // Open the file "data/urls.txt" in append mode to log the added URL
    std::ofstream out("data/urls.txt", std::ios::app); // append mode

    if (out.is_open()) { // Check if the file was successfully opened.
         out << url << "\n"; // Write the URL to the file, followed by a newline character.
     
    } else {
         // Write an error message if the file could not be opened.
         std::cerr << "Failed to open data/urls.txt for writing.\n";
    }
    if (!saveToFile("bloom_state.bin")) {
        std::cerr << "[Warning] Failed to save BloomFilter state\n";
    }
}


// Loads the Bloom Filter from a file. If the file is missing or damaged,
// it starts with an empty filter and sets the hash functions.
bool BloomFilter::load_from_file(const std::string& filename,
    const std::vector<std::shared_ptr<HashFunction>>& hash_funcs) {
// Try to open the file in binary mode for reading
std::ifstream infile(filename, std::ios::binary);
// If the file doesn't exist, start with an empty filter
if (!infile) {
std::cerr << "File not found: " << filename << ". Initializing empty filter." << std::endl;
initialize_empty_filter(); // Create empty Bloom filter
hash_functions = hash_funcs; // Set the provided hash functions
return false; // Loading fail indicator
}


try {
// Read the first part of the file
infile.read(reinterpret_cast<char*>(&this->size), sizeof(size_t));
if (!infile) throw std::runtime_error("Failed to read size");
// Resize the bit array to match the size read from fil
bit_array.resize(size);
// Read the bit values one by one
for (size_t i = 0; i < size; ++i) {
char bit;
infile.read(&bit, 1);  // Read a single byte
if (!infile) throw std::runtime_error("Failed to read bit array");
bit_array[i] = (bit != 0); // Convert byte to bool
}

hash_functions = hash_funcs;  // Set the hash functions
return true; // Successfully loaded
// If any reading error occurs, catch and handle it
}
catch (const std::exception& e) {
    std::cerr << "[Error] Corrupted file: " << e.what() << ". Reinitializing." << std::endl;
    initialize_empty_filter();  // Start with an empty filter
    hash_functions = hash_funcs;  // Set the hash functions again
    return false; // Indicate that loading failed
    }
}

    // Saves the current Bloom Filter to a binary file and stores the size followed by the bit values.
    // This allows the filter to be restored on future runs.
    void BloomFilter::save_to_file(const std::string& filename) const {
    // Open the file in binary mode for writing
    std::ofstream outfile(filename, std::ios::binary);
    // If the file cannot be opened, report an error and exit the function
    if (!outfile) {
    std::cerr << "[Error] Failed to open file for writing: " << filename << std::endl;
    return;
}

// Write the size of the bit array
outfile.write(reinterpret_cast<const char*>(&this->size), sizeof(size_t));

// Write each bit value (true/false) as a single byte
    for (bool bit : bit_array) {
    char b = bit ? 1 : 0;
    outfile.write(&b, 1);
    }
}

// Checks if a string might be in the Bloom Filter
bool BloomFilter::possiblyContains(const std::string& url) const {
    for (const auto& hash : hash_functions) {
        size_t idx = (*hash)(url) % size;
        if (!bit_array[idx]) return false;
    }
    return true;
}

// Saves the Bloom Filter in compact binary format
bool BloomFilter::saveToFile(const std::string& filename) const {
    std::ofstream out(filename, std::ios::binary);
    if (!out) return false;

    out.write(reinterpret_cast<const char*>(&size), sizeof(size));

    uint8_t byte = 0;
    int bits_filled = 0;
    for (bool b : bit_array) {
        byte = (byte << 1) | (b ? 1 : 0);
        if (++bits_filled == 8) {
            out.put(static_cast<char>(byte));
            byte = 0;
            bits_filled = 0;
        }
    }

    if (bits_filled) {
        byte <<= (8 - bits_filled);
        out.put(static_cast<char>(byte));
    }

    return true;
}


// Initializes the Bloom Filter with a default size and clears the bit array.
void BloomFilter::initialize_empty_filter() {
    size = 256;  // Default size, can be adjusted
    bit_array.assign(size, false);
}

// Loads the Bloom Filter's bit array from a binary file
bool BloomFilter::loadFromFile(const std::string& filename) {
    std::ifstream in{ filename, std::ios::binary };
    if (!in) {
        // File does not exist or cannot be opened
        return false;
    }

    // 1) read stored size
    size_t file_size = 0;
    in.read(reinterpret_cast<char*>(&file_size), sizeof(file_size));
    if (!in || file_size == 0) {
        // couldn't read size or got zero
        return false;
    }
    if (file_size != this->size) {
        // stored filter size differs from our in‑memory size
        return false;
    }

    // 2) read packed bits into a temporary array
    std::vector<bool> new_bits(size, false);
    char byte = 0;
    size_t idx = 0;
    while (in.get(byte) && idx < size) {
        // unpack one byte → up to 8 bits
        for (int shift = 7; shift >= 0 && idx < size; --shift, ++idx) {
            new_bits[idx] = ((byte >> shift) & 1) != 0;
        }
    }

    if (idx < size) {
        // didn't read enough bits → corrupted file
        return false;
    }

    // 3) only now, replace the in‑memory bit_array
    this->bit_array = std::move(new_bits);
    return true;
}