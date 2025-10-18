#include "TCP_Server.h"
#include <iostream>
#include <unistd.h>
#include <cstring>
#include <netinet/in.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include "InfiniteCommandLoop.h"
#include <optional>
#include <mutex>
#include <thread>

// Constructor
TCPServer::TCPServer(int port) : port(port), filter(nullptr), server_fd(-1), client_fd(-1), addrlen(sizeof(address)) {}

// Method to set the BloomFilter for the server
void TCPServer::setFilter(BloomFilter* f) {
    std::lock_guard<std::mutex> lock(filter_mutex);
    filter = f;
}

// Method to get the BloomFilter for the server
BloomFilter* TCPServer::getFilter() {
    std::lock_guard<std::mutex> lock(filter_mutex);
    return filter;
}

// Method to create a socket
void TCPServer::createSocket()
{
    server_fd = socket(AF_INET, SOCK_STREAM, 0); // Create a TCP socket
    if (server_fd < 0)
    { // Check if socket creation failed
        perror("Socket creation failed");
        exit(EXIT_FAILURE);
    }
}


void TCPServer::bindSocket()
{
    address.sin_family = AF_INET;
     address.sin_addr.s_addr = INADDR_ANY; // Listen on all available interfaces
    address.sin_port = htons(port);


    if (inet_pton(AF_INET, ip_address.c_str(), &address.sin_addr) <= 0)
    {
        perror("Invalid IP address");
        exit(EXIT_FAILURE);
    }

    if (bind(server_fd, (struct sockaddr *)&address, sizeof(address)) < 0)
    {
        perror("Binding failed");
        exit(EXIT_FAILURE);
    }
}

TCPServer::TCPServer(const std::string &ip, int port)
    : ip_address(ip), port(port), filter(nullptr), server_fd(-1), client_fd(-1), addrlen(sizeof(address)) {}

// Method to listen for incoming connections
void TCPServer::listenForConnections()
{
    if (listen(server_fd, SOMAXCONN) < 0)
    { // Listen for incoming connections with a backlog of SOMAXCONN.
    // SOMAXCONN is a constant that defines the maximum number of pending connections.
        perror("Listening failed");
        exit(EXIT_FAILURE);
    }
}
// Method to accept a connection from a client
// This call blocks until a client connects and returns a new socket.
void TCPServer::acceptConnection()
{
    client_fd = accept(server_fd, (struct sockaddr *)&address, (socklen_t *)&addrlen); // Accept a connection from a client
    if (client_fd < 0)
    { // Check if connection acceptance failed
        perror("Connection acceptance failed");
        exit(EXIT_FAILURE);
    }
}

// Method to handle communication with the client
void TCPServer::handleClient()
{
    if (client_fd >= 0) {
        // Create a detached thread with a copy of client_fd to ensure each thread handles its own unique connection
        std::thread([this, sock = client_fd]() {
            InfiniteCommandLoop loop(sock, filter, &filter_mutex); // Call the infinite command loop to handle client communication
            loop.run();
            close(sock); // Close the client socket after communication ends
        }).detach();
    } 
}

// Method to run the server, handling connections and communication in a loop
void TCPServer::run()
{
    createSocket();         // Create the socket
    bindSocket();           // Bind the socket to the address and port
    listenForConnections(); // Listen for incoming connections
    while (true)
    {                       // Main server loop
        acceptConnection(); // Accept a connection from a client
        handleClient();     // Handle communication with the client
    }
}

// Method to send a message to the client
void TCPServer::sendMessage(const std::string &message)
{
    send(client_fd, message.c_str(), message.size(), 0); // Send the message to the client
}
// Method to receive a message from the client
// This method blocks until a message is received or the client disconnects.
std::string TCPServer::receiveMessage()
{
    char buffer[1024] = {0};                                         // Buffer to hold the received message
    int bytes_received = recv(client_fd, buffer, sizeof(buffer), 0); // Receive a message from the client
    if (bytes_received <= 0)
        return "";                              // Return empty string if no data received or client disconnected
    return std::string(buffer, bytes_received); // Return the received message as a string
}

std::string TCPServer::receiveFirstLineBuffered()
{
    // std::cout<<"Out first call!\n"; // Send welcome message
    static std::string buffer;

    size_t newlinePos = buffer.find('\n');
    if (newlinePos != std::string::npos)
    {
        std::string line = buffer.substr(0, newlinePos);
        buffer = buffer.substr(newlinePos + 1);
        return line;
    }

    std::string msg = receiveMessage();
    if (msg.empty())
    {
        return "";
    }

    buffer += msg;

    newlinePos = buffer.find('\n');
    if (newlinePos != std::string::npos)
    {
        std::string line = buffer.substr(0, newlinePos);
        buffer = buffer.substr(newlinePos + 1);
        return line;
    }
    return "";
}

std::string TCPServer::receiveLineBuffered()
{
    static std::string buffer; // saved between calls
    while (true)
    {
        size_t newlinePos = buffer.find('\n');
        if (newlinePos != std::string::npos)
        {
            // found a complete line
            std::string line = buffer.substr(0, newlinePos);
            buffer = buffer.substr(newlinePos + 1); // rest of the buffer
            return line;
        }

        // haven't found a complete line yet
        // receive more data
        std::string msg = receiveMessage();
        if (msg.empty())
        {
            // error or connection closed
            return "";
        }

        buffer += msg;
    }
}

// Method to close the server and client sockets
void TCPServer::closeConnections()
{
    if (client_fd != -1)
        close(client_fd); // Close the client socket if it's open
    if (server_fd != -1)
        close(server_fd); // Close the server socket if it's open
}

// Destructor
TCPServer::~TCPServer()
{
    closeConnections(); // Close the server and client sockets
}