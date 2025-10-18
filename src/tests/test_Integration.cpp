#include "gtest/gtest.h"
#include "TCP_Server.h"
#include <thread>
#include <chrono>
#include <cstring>
#include <arpa/inet.h>
#include <unistd.h>

// Sends a message over TCP and returns the response
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

TEST(IntegrationTest, FullClientServerFlow) {
    // Start server in background
    std::thread serverThread([] {
        TCPServer server(1234);
        server.run();
    });

    std::this_thread::sleep_for(std::chrono::seconds(1));

    // Send configuration line
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

    // Step 1: POST
    std::string postResponse = sendAndReceive("POST www.test.com\n");
    EXPECT_EQ(postResponse, "201 Created\n");

    // Step 2: GET
    std::string getResponse = sendAndReceive("GET www.test.com\n");
    EXPECT_EQ(getResponse, "200 Ok\n\ntrue true");

    // Step 3: DELETE (valid)
    std::string deleteResponse = sendAndReceive("DELETE www.test.com\n");
    EXPECT_EQ(deleteResponse, "204 No Content\n");

    // Step 4: DELETE again (invalid)
    std::string secondDelete = sendAndReceive("DELETE www.test.com\n");
    EXPECT_EQ(secondDelete, "404 Not Found\n");

    // Step 5: Invalid commands
    EXPECT_EQ(sendAndReceive("BLABLA www.whatever.com\n"), "400 Bad Request\n");
    EXPECT_EQ(sendAndReceive("POST\n"), "400 Bad Request\n");
    EXPECT_EQ(sendAndReceive("\n"), "400 Bad Request\n");
    EXPECT_EQ(sendAndReceive("GET www.x.com extra\n"), "400 Bad Request\n");

    // Stop the server
    ::exit(0);
}
