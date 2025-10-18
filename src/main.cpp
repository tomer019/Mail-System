#include "TCP_Server.h"
#include <iostream>
#include <cstdlib> // atoi
#include <string>

int main(int argc, char *argv[])
{
    if (argc != 5 && argc != 6) {
        std::cerr << "Usage: " << argv[0] << " <IP> <PORT> <n> <m1> [<m2>]\n";
        return 1;
    }

    std::string ip = argv[1];
    int port = std::atoi(argv[2]);

    if (port <= 0 || port > 65535)
    {
        std::cerr << "Invalid port number.\n";
        return EXIT_FAILURE;
    }

    // Build configuration line from args
    std::string config_line = argv[3];
    config_line += " ";
    config_line += argv[4];
    if (argc == 6) {
        config_line += " ";
        config_line += argv[5];
    }

    try
    {
        TCPServer server(ip, port, config_line);
        std::cout << "Starting server on IP: " << ip << ", Port: " << port << "\n";
        server.run();
    }
    catch (const std::exception &e)
    {
        std::cerr << "Exception: " << e.what() << "\n";
        return EXIT_FAILURE;
    }

    return EXIT_SUCCESS;
}
