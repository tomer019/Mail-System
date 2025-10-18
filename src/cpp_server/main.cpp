#include "TCP_Server.h"
#include "BloomFilter.h"
#include "bloom_setup.h"
#include <iostream>
#include <string>
#include <regex>
#include <cstdlib>

int main(int argc, char* argv[]) {
    if (argc != 5 && argc != 6) {
        std::cerr << "Usage: " << argv[0] << " <IP> <PORT> <n> <m1> [<m2>]\n";
        return 1;
    }

    std::string ip = argv[1];
    std::string port_str = argv[2];

    // Validate IP address format
    std::regex ip_regex(R"(^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$)");
    if (!std::regex_match(ip, ip_regex)) {
        std::cerr << "Invalid IP address format.\n";
        return 1;
    }

    // Validate port is a number and in range
    int port = std::stoi(port_str);
    if (port <= 1024 || port > 65535) {
        std::cerr << "Invalid port. Must be > 1024 and <= 65535.\n";
        return 1;
    }

    // Build configuration line from args
    std::string config_line = argv[3];
    config_line += " ";
    config_line += argv[4];
    if (argc == 6) {
        config_line += " ";
        config_line += argv[5];
    }

    // Start server and configure it
    TCPServer mailServer(ip, port);
    BloomFilter shared_filter = createFromConfigLine(config_line, mailServer);
    mailServer.setFilter(&shared_filter);
    mailServer.run();

    return 0;
}
