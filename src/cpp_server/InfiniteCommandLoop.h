#ifndef INFINITE_COMMAND_LOOP_H
#define INFINITE_COMMAND_LOOP_H

#include <vector>
#include <string>
#include <mutex>

class BloomFilter; // Forward declaration of BloomFilter class

class InfiniteCommandLoop
{
private:
    int client_fd; // Client socket descriptor
    BloomFilter* filter; // Shared BloomFilter pointer
    std::mutex* filter_mutex; // Shared mutex for thread safety
    static constexpr char STATE_FILE[] = "data/bloom_state.bin"; // File to save BloomFilter state
    
    std::string receiveLine(); // Receives a line from the client
    void sendMessage(const std::string&); // Sends a message to the client
    
    static std::vector<std::string> splitArguments(const std::string &line); // Splits a line of input into arguments

public:
    InfiniteCommandLoop(int client_fd, BloomFilter* filter, std::mutex* filter_mutex);
    void run(); // Starts the infinite command loop
};

#endif // INFINITE_COMMAND_LOOP_H