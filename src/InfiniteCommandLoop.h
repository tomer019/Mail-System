#ifndef INFINITE_COMMAND_LOOP_H
#define INFINITE_COMMAND_LOOP_H

#include <vector>
#include <string>
#include "TCP_Server.h"

class InfiniteCommandLoop
{
public:
    // Starts the infinite command loop
    static void loop(TCPServer &server, const std::string &config_line);

private:
    // Splits a line of input into arguments
    static std::vector<std::string> splitArguments(const std::string &line);
    // File to save BloomFilter state
    static constexpr char STATE_FILE[] = "data/bloom_state.bin";
};

#endif // INFINITE_COMMAND_LOOP_H