#include "gtest/gtest.h"
#include "TCP_Server.h"
#include <thread>
#include <chrono>
#include <cstring>
#include <arpa/inet.h>
#include <unistd.h>

// Send a single-line message and receive response
std::string sendAndReceive(const std::string& msg) {
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    sockaddr_in serv_addr{};
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

TEST(IntegrationTest, ServerHandlesBadRequests) {
    // Start the server in the background
    std::thread serverThread([] {
        TCPServer server(1234);
        server.run();
    });

    std::this_thread::sleep_for(std::chrono::seconds(1));

    // Send initial config
    {
        int sock = socket(AF_INET, SOCK_STREAM, 0);
        sockaddr_in serv_addr{};
        serv_addr.sin_family = AF_INET;
        serv_addr.sin_port = htons(1234);
        inet_pton(AF_INET, "127.0.0.1", &serv_addr.sin_addr);
        connect(sock, (struct sockaddr*)&serv_addr, sizeof(serv_addr));
        send(sock, "8 1\n", 4, 0);

        char buffer[1024] = {0};
        recv(sock, buffer, sizeof(buffer) - 1, 0);
        close(sock);
    }

    // Send completely invalid command
    std::string resp1 = sendAndReceive("BLABLA www.example.com0\n");
    EXPECT_EQ(resp1, "400 Bad Request\n");

    // Send valid command without URL
    std::string resp2 = sendAndReceive("POST\n");
    EXPECT_EQ(resp2, "400 Bad Request\n");

    // Send empty string
    std::string resp3 = sendAndReceive("\n");
    EXPECT_EQ(resp3, "400 Bad Request\n");

    // Send malformed GET with too many arguments
    std::string resp4 = sendAndReceive("GET www.example.com0 extra\n");
    EXPECT_EQ(resp4, "400 Bad Request\n");

    ::exit(0); // Exit to stop infinite server loop
}
