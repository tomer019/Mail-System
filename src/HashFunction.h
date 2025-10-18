#ifndef HASHFUNCTION_H
#define HASHFUNCTION_H

#include <string>

class HashFunction {
public:
    virtual ~HashFunction() = default;
    virtual size_t operator()(const std::string& input) const = 0;
};

#endif
