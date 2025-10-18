#ifndef TCP_SERVER_H
#define TCP_SERVER_H

#include <netinet/in.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <string>
#include <mutex>
#include "BloomFilter.h"
// Definition of the TCPServer class
class TCPServer
{
private:
    std::string ip_address;
    int server_fd, client_fd, port; // File descriptors for the server and client sockets, and the listening port
    struct sockaddr_in address;     // Structure to hold server address information
    int addrlen;                    // Length of the address structure
    BloomFilter* filter;            // Pointer to a BloomFilter object for filtering messages
    std::mutex filter_mutex;

public:
    TCPServer(int port); // Constructor to initialize the server with a specific port
    TCPServer(const std::string &ip, int port);
    void createSocket();// Method to create a socket
    void bindSocket();// Method to bind the socket to the address and port
    void listenForConnections();// Method to listen for incoming connections
    void acceptConnection();// Method to accept a connection from a client
    void handleClient();// Method to handle communication with the client
    void run();// Method to run the server, handling connections and communication in a loop
    void closeConnections();  // Method to close the server and client sockets
    void sendMessage(const std::string &message); // Method to send a message to the client
    std::string receiveMessage(); // Method to receive a message from the client
    std::string receiveLineBuffered(); // Method to receive a line of input from the client
    std::string receiveFirstLineBuffered(); // Method to receive the first line of input from the client
    void setFilter(BloomFilter* f); // Method to set the BloomFilter for the server
    BloomFilter* getFilter(); // Method to get the BloomFilter for the server
    ~TCPServer();   // Destructor
};
#endif // TCP_SERVER_H