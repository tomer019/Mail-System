> **Note:** This README provides a high-level overview of the project.  
> For complete documentation, step-by-step guides, and full API references, please see the `/wiki` directory.

# Gmail Application – Full-Stack Email Management System

A Gmail-like email application with a **Node.js/Express backend**, **Android (Java) frontend**, and **MongoDB database**.  

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Android Emulator / Device (set to English language)

Run the server from the **src folder**
```bash
 docker compose up -d --build
```

📱 Android Client: All mobile app files are in the /myapplication directory, please ensure your emulator/device is set to English language before running the app

## Features

 * User registration/login & JWT authentication

 * Gmail-style labels (system & custom)

 * Email sending, receiving, drafts, and multi-recipient support (To, CC, BCC)

 * Spam detection with automated blacklist filtering

 * Delete, Star, and Search functionality

 * Dark mode with full UI adaptation

**Architecture**: 

* Frontend: * Android (Java) - Mobile client with MVVM pattern + Room for local data persistence

** Backend: Node.js + Express - RESTful API with MongoDB

* Blacklist Server: C++17 multi-threaded TCP server using Bloom Filter

**Project Management**: Development progress tracked in JIRA

**Documentation**: See /wiki directory for detailed guides and API reference.

## Project Structure (Overview)

MAIL/

├── .myapplication/                         →  Android frontend (Java)

├── src/

│   ├── cpp_server/                         →  C++ blacklist server

│   ├── node_server/                       → Node.js backend AND MongoDB

## Team

  * Almog Meirov
  * Tomer Grady
  * Meir Crown


## Technologies Used
  * *Android (Java) - Mobile client with MVVM pattern* 
  * *Node.js + Express - REST API server*
  * *MongoDB - Document database*
  * *C++17 (multi-threaded) - Blacklist server*
  * *Docker + Docker Compose - Containerization*
  * *C++17 (multi-threaded)*
  * *JWT Authentication - Secure token-based auth*
  * *Bloom Filter* for blacklist
  * *TCP Socket Communication*



**Enjoy exploring the Gmail Application!**

