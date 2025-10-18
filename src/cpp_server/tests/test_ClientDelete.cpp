#include "gtest/gtest.h"
#include "TCP_Server.h"
#include <thread>
#include <chrono>
#include <cstring>
#include <arpa/inet.h>
#include <unistd.h>

// Helper to send a message and receive the response
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

TEST(IntegrationTest, ServerHandlesDeleteCorrectly) {
    // Start server thread
    std::thread serverThread([] {
        TCPServer server(1234);
        server.run();
    });

    std::this_thread::sleep_for(std::chrono::seconds(1));

    // Send initial config line
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

    // Add URL with POST
    std::string postResponse = sendAndReceive("POST www.todelete.com\n");
    EXPECT_EQ(postResponse, "201 Created\n");

    // DELETE the URL
    std::string deleteResponse = sendAndReceive("DELETE www.todelete.com\n");
    EXPECT_EQ(deleteResponse, "204 No Content\n");

    // DELETE again (should fail)
    std::string secondDelete = sendAndReceive("DELETE www.todelete.com\n");
    EXPECT_EQ(secondDelete, "404 Not Found\n");

    ::exit(0); // Force stop the server thread
}
