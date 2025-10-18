#ifndef HASHSTD_H
#define HASHSTD_H

#include "HashFunction.h"
#include <functional> // Includes std::hash from the standard library

// HashStd is implement of HashFunction
// Uses std::hash<std::string> to generate a hash value from an input string
class HashStd : public HashFunction {
    public:
    // Overrides the pure virtual operator() from HashFunction and applies std::hash to the input string and returns the result
    size_t operator()(const std::string& input) const override {
        return std::hash<std::string>{}(input); // Call std::hash
    }
};

#endif