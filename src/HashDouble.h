#ifndef HASHDOUBLE_H        
#define HASHDOUBLE_H

#include "HashFunction.h"
#include <functional> // Includes std::hash from the standard library

// HashDouble is another implementation of HashFunction
// It modifies the input string by adding a salt before hashing
class HashDouble : public HashFunction {
public:
    // Overrides the pure virtual operator() from HashFunction and adds a Double string to the input before hashing to create a different hash result
    size_t operator()(const std::string& input) const override {
        return std::hash<std::string>{}(input + "Double");  // Add "Double" to the input string and hash it
    }
};

#endif