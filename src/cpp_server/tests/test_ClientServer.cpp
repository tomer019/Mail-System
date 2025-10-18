#include "gtest/gtest.h"
#include "TCP_Server.h"
#include "HashStd.h"
#include "BloomFilter.h"
#include "bloom_setup.h"
#include "InfiniteCommandLoop.h"
#include <thread>
#include <chrono>
#include <cstring>
#include <arpa/inet.h>
#include <unistd.h>

// Helper to create a client socket and send a full message (with newline)
std::string sendAndReceive(const std::string& msg) {
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    sockaddr_in serv_addr;
    serv_addr.sin_family = AF_INET;
    serv_addr.sin_port = htons(1234);

    inet_pton(AF_INET, "127.0.0.1", &serv_addr.sin_addr);
    connect(sock, (struct sockaddr*)&serv_addr, sizeof(serv_addr));

    send(sock, msg.c_str(), msg.size(), 0);

    char buffer[1024] = {0};
    int len = recv(sock, buffer, sizeof(buffer) - 1, 0);
    buffer[len] = '\0';

    close(sock);
    return std::string(buffer);
}

TEST(IntegrationTest, ServerHandlesPostAndGet) {
    // Start the server in a background thread
    std::thread serverThread([] {
        TCPServer server(1234);
        server.run();
    });

    // Allow server time to start
    std::this_thread::sleep_for(std::chrono::seconds(1));

    // Initial handshake (config line)
    {
        int sock = socket(AF_INET, SOCK_STREAM, 0);
        sockaddr_in serv_addr;
        serv_addr.sin_family = AF_INET;
        serv_addr.sin_port = htons(1234);
        inet_pton(AF_INET, "127.0.0.1", &serv_addr.sin_addr);
        connect(sock, (struct sockaddr*)&serv_addr, sizeof(serv_addr));
        send(sock, "8 1\n", 4, 0);

        char buffer[1024] = {0};
        recv(sock, buffer, sizeof(buffer) - 1, 0);
        close(sock);
    }

    // Send POST
    std::string response1 = sendAndReceive("POST www.example.com0\n");
    EXPECT_EQ(response1, "201 Created\n");

    // Send GET
    std::string response2 = sendAndReceive("GET www.example.com0\n");
    EXPECT_EQ(response2, "200 Ok\n\ntrue true");

    // Clean up
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    ::exit(0); // Forcefully stop the server thread (since it's infinite)
}
