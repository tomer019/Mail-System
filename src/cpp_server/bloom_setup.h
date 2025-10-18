#ifndef BLOOM_SETUP_H
#define BLOOM_SETUP_H

#include "BloomFilter.h"
#include "TCP_Server.h"
#include <memory>
#include <vector>
#include <string>

// return Configured BloomFilter instance.
BloomFilter createFromConfigLine(const std::string &line, TCPServer &server);

#endif
