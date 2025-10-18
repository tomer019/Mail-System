# Mail

you can find our repository in the link: https://github.com/AlmogMeirov/Mail.git

**This part implements the Node.js web server (Exercise 3), responsible for user authentication, mail handling, and integrating with the blacklist TCP server from Exercise 2.**

## Purpose

In this part of the project, we developed a *Node.js web server* that exposes a RESTful API for handling a simple mail system (similar to Gmail). The server interacts with a C++ *blacklist server* from exercise 2 to verify links within mail content using a *TCP socket*.

The system supports:

* User registration and login with JWT authentication
* Sending and receiving mails
* Label creation and management
* Integration with the blacklist server (via TCP) to block mails with blacklisted URLs


## Build and Run Instructions

### Prerequisites:

* Docker
* Docker Compose

  
The following curl commands are written for bash on Linux-based systems.
They can also be executed on Windows using CMD or PowerShell, with appropriate syntax adjustments (e.g., quoting and escaping).

#### Step 1: Build & Start the Services
### Open fitst terminal:

  In the root project directory, run:

 ```
  docker-compose up --build
 ```

  This will build and start two services:

* mail-server: A Node.js web server on port 3000
* blacklist-server: A C++ TCP server on port 5555, connected to a persistent urls.txt file for blacklist storage

---

### Open a second terminal:
## API Usage
  ###  Register a user

   ```
    curl -i -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d '{"email":"<EMAIL>","password":"<PASSWORD>","firstName":"<FIRST_NAME>","lastName":"<LAST_NAME>"}'
   ```

  ### Login to get JWT token

  ```
    BOB_TOKEN=$(curl -s -X POST http://localhost:3000/api/tokens -H "Content-Type: application/json" -d '{"email":"<EMAIL>","password":"<PASSWORD>"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
  ```
  Save the token from the response to use in future authenticated requests. (not exist in CMD, when you work in CMD you need to write down the token every time it requries).

  ### Get user by ID
   ```
   curl -i -X GET http://localhost:3000/api/users/<ID> -H "Content-Type: application/json" -H "Authorization: Bearer $<TOKEN>"
   ```
  

## Mail

  ### Send a new mail

   ```
   curl -i -X POST http://localhost:3000/api/mails -H "Authorization: Bearer $<TOKEN>" -H "Content-Type: application/json" -d '{"sender":"<SENDER_EMAIL>", "recipient":"<RECIPIENT_EMAIL>", "subject":"<SUBJECT>", "content":"<CONTENT>"}'
```
    If any link in the content is blacklisted, you’ll get:
    HTTP/1.1 400 Bad Request
    X-Powered-By: Express
    Content-Type: application/json; charset=utf-8
    Content-Length: 44
    ETag: W/"2c-lhpwL7K38bFeBMPyBndDrwyE2Ko"
    Date: Thu, 19 Jun 2025 09:42:07 GMT
    Connection: keep-alive
    Keep-Alive: timeout=5

    {"error":"Message contains blacklisted URL"}
  

 ###  Send mail to multiple recipients
  ```
    curl -i -X POST http://localhost:3000/api/mails -H "Authorization: Bearer $<TOKEN>" -H "Content-Type: application/json" -d '{"sender":"<SENDER_EMAIL>","recipients":     ["<FIRST_RECIPIENT_EMAIL>",...,"<LAST_RECIPIENT_EMAIL>"],"subject":"<SUBJECT>","content":"<CONTENT>"}'
 ```

  ### Get the 50 most recent mails

  ```
    curl -i -X GET http://localhost:3000/api/mails -H "Authorization: Bearer $<TOKEN>"
 ```

  ### Search mails by query

  ```
    curl -i -X GET http://localhost:3000/api/mails/search/<QUERY> -H "Authorization: Bearer $<TOKEN>"
```
    Replace <QUERY> with the search string you want.
  

  ### Search mails by ID
   ```
    curl -i -X GET http://localhost:3000/api/mails/<MAIL_ID> -H "Authorization: Bearer $<TOKEN>"
  ```
Replace <MAIL_ID> with the ID of the mail you want.

  ### Assigning a label to a mail
  
  ```
  curl -i -X PATCH http://localhost:3000/api/mails/<MAIL_ID>/label -H "Authorization: Bearer $<TOKEN>" -H "Content-Type: application/json" -d '{"labels":"[<label name>]"}'
  ```


## Labels

  ### Create a label

 ```
 curl -i -X POST http://localhost:3000/api/labels -H "Authorization: Bearer $<TOKEN>" -H "Content-Type: application/json" -d '{"name":"<label name>"}'
 ```

  ### View all labels

   ```
    curl -i -X GET http://localhost:3000/api/labels -H "Authorization: Bearer $<TOKEN>"
  ```

  #### Get a label by ID for the current user
  ```
curl -i -X GET http://localhost:3000/api/labels/<LABEL_ID> -H "Authorization: Bearer $<TOKEN>"
  ```
  
  ### Update a label by ID for the current user
  ```
  curl -i -X PATCH http://localhost:3000/api/labels/<LABEL_ID> -H "Authorization: Bearer $<TOKEN>" -H "Content-Type: application/json" -d '{"name": "<UpdatedLabelName>"}'
  ```
  
  ### Delete a label by ID for the current user
  ```
  curl -i -X DELETE http://localhost:3000/api/labels/<LABEL_ID> -H "Authorization: Bearer $<TOKEN>"
  ```
  ### Search labels by substring in name
  ```
  curl -i -X GET http://localhost:3000/api/labels/search/<SUBSTRING> -H "Authorization: Bearer $<TOKEN>"
  ```

## Blacklist

  ### Add a malicious URL

   ```
curl -i -X POST http://localhost:3000/api/blacklist -H "Content-Type: application/json" -d '{"url":"enter url"}'
   ```

  ### Remove a malicious URL
  ```
curl -i -X DELETE http://localhost:3000/api/blacklist/id
```

If you're using the same terminal, press Ctrl+C to exit this part and continue with the email section.

## Example Run

  ```
# Register Bob
curl -i -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d '{"email":"bob@example.com","password":"bobspassword","firstName":"Bob","lastName":"Builder"}'

HTTP/1.1 201 Created
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 75
ETag: W/"4b-dtmlkvwiZBT7DKKxAjA5xO7yFNE"
Date: Thu, 19 Jun 2025 09:08:42 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":1,"email":"bob@example.com","name":"Bob Builder","profileImage":null}

# Register Alice
curl -i -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d '{"email":"alice@example.com","password":"alicepassword","firstName":"Alice","lastName":"Wonder"}'

HTTP/1.1 201 Created
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 78
ETag: W/"4e-kxxjoCZB1ock7f/I/U8l7CIOwFA"
Date: Thu, 19 Jun 2025 09:09:39 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":2,"email":"alice@example.com","name":"Alice Wonder","profileImage":null}

# Login and get tokens

BOB_TOKEN=$(curl -s -X POST http://localhost:3000/api/tokens -H "Content-Type: application/json" -d '{"email":"bob@example.com","password":"bobspassword"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

ALICE_TOKEN=$(curl -s -X POST http://localhost:3000/api/tokens -H "Content-Type: application/json" -d '{"email":"alice@example.com","password":"alicepassword"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

# Alice sends mail to Bob

curl -i -X POST http://localhost:3000/api/mails -H "Authorization: Bearer $ALICE_TOKEN" -H "Content-Type: application/json" -d '{"sender":"alice@example.com", "recipient":"bob@example.com", "subject":"Project Update", "content":"Hey Bob, here is the project update."}'

HTTP/1.1 201 Created
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 284
ETag: W/"11c-GLl0tahBIxto35BBd6PVU07ywxg"
Date: Thu, 19 Jun 2025 09:11:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"message":"Mail sent successfully","sent":[{"id":"64dda02f-cbcd-4e34-8fb8-f974b0dd5976","sender":"alice@example.com","recipient":"bob@example.com","subject":"Project Update","content":"Hey Bob, here is the project update.","labels":["inbox"],"timestamp":"2025-06-19T09:11:28.589Z"}]}

# Bob retrieves it

curl -i -X GET http://localhost:3000/api/mails/64dda02f-cbcd-4e34-8fb8-f974b0dd5976 -H "Authorization: Bearer $BOB_TOKEN"
    
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 231
ETag: W/"e7-CIl3eIhkrhRgH0fwQjdtR9hCZZM"
Date: Thu, 19 Jun 2025 09:13:03 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":"64dda02f-cbcd-4e34-8fb8-f974b0dd5976","sender":"alice@example.com","recipient":"bob@example.com","subject":"Project Update","content":"Hey Bob, here is the project update.","timestamp":"2025-06-19T

# Bob fetches all last 50 mails associated with his account

curl -i -X GET http://localhost:3000/api/mails -H "Authorization: Bearer $BOB_TOKEN"

HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 202
ETag: W/"ca-oFD+UE1IYoV8BLxZLRW/0/J/kro"
Date: Thu, 19 Jun 2025 09:49:48 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"message":"Mails fetched successfully","recent_mails":[{"id":"64dda02f-cbcd-4e34-8fb8-f974b0dd5976","subject":"Project Update","timestamp":"2025-06-19T09:11:28.589Z","direction":"received"}],"sent":[]

# Assign label

curl -i -X POST http://localhost:3000/api/labels -H "Authorization: Bearer $BOB_TOKEN" -H "Content-Type: application/json" -d '{"name":"Work"}'

HTTP/1.1 201 Created
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 59
ETag: W/"3b-oaLLrpn4sc7W3YeTLvu2lqCr/Ck"
Date: Thu, 19 Jun 2025 09:35:10 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":"1cbadb9e-058e-403b-82f2-837232f06fce","name":"Work"}

curl -i -X PATCH http://localhost:3000/api/mails/64dda02f-cbcd-4e34-8fb8-f974b0dd5976/label -H "Authorization: Bearer $BOB_TOKEN" -H "Content-Type: application/json" -d '{"labels":["Work"]}'
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 46
ETag: W/"2e-LE0aA20mwupYZEHSTmowKpp+WH4"
Date: Thu, 19 Jun 2025 09:39:40 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"message":"Labels updated","labels":["Work"]}

# Blocked URL case

curl -i -X POST http://localhost:3000/api/blacklist -H "Content-Type: application/json" -d '{"url":"http://gidi.gov"}'
HTTP/1.1 201 Created
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 32
ETag: W/"20-0WV+Ikol2wEW84pr4ea9j67h1us"
Date: Thu, 24 Jul 2025 10:32:32 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":1,"url":"http://gidi.gov"}

 curl -i -X POST http://localhost:3000/api/mails -H "Authorization: Bearer $ALICE_TOKEN" -H "Content-Type: application/json" -d '{"sender":"alice@example.com", "recipient":"bob@example.com", "subject":"Project Update", "content":"http://gidi.gov"}'
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 44
ETag: W/"2c-lhpwL7K38bFeBMPyBndDrwyE2Ko"
Date: Thu, 19 Jun 2025 09:42:07 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":"Message contains blacklisted URL"}



  ```
##  Implementation Notes

  * The C++ server uses a Bloom Filter to quickly check for URL membership
  * All communication between the web server and C++ blacklist server happens over TCP
  * Data is kept *in memory* in the web server (no database is used)

  ---


## Docker Notes

  * *Blacklist server* expects the file data/urls.txt to exist or will create it
  * Ports used:
    * Node server: 3000
    * TCP server: 5555 (internal communication only)
  * Containers communicate using Docker’s internal network (via container name)

  To stop the services:

  ```bash
  docker-compose down
  ```


##  Project Structure

MAIL/
├── .vscode/                         → VSCode workspace settings

├── data/                            → Shared data (e.g., urls.txt used by the C++ server)

├── server/

│   └── controllers/

│       └── mailController.js        → Legacy controller (can be migrated under src/)

├── src/

│   ├── cpp_server/                  → C++ TCP blacklist server

│   │   ├── BloomFilter.cpp/.h       → Bloom filter implementation

│   │   ├── Hash*.h                  → Hash function variants

│   │   ├── InfiniteCommandLoop.cpp  → Main server loop

│   │   ├── URL*.cpp/.h              → URL checker, storage, and utility logic

│   │   ├── tcp_client.py            → Python client for testing

│   │   ├── CMakeLists.txt           → Build configuration for C++ components

│   │   └── dockerfile               → Docker config for C++ server

│   └── node_server/                → Node.js web server

│       ├── controllers/            → Logic for routes (e.g., auth, mails)

│       ├── middlewares/           → Token authentication (JWT)

│       ├── models/                 → In-memory storage for users and mails

│       ├── routes/                 → Express route definitions

│       ├── uploads/                → Uploaded user profile images

│       ├── utils/                  → Utility functions (e.g., crypto)

│       ├── app.js                  → Express app setup

│       ├── curl/                   → CURL test scripts (optional)

│       ├── dockerfile              → Docker config for Node.js server

│       ├── index.js                → Main entry point (runs the server)

│       ├── package.json            → Project metadata and dependencies

│       └── package-lock.json

├── docker-compose.yml             → Compose file to orchestrate both services

├── dockerfile                     → (Possibly legacy) Dockerfile

├── CMakeLists.txt                 → Top-level CMake (links into src/cpp_server)

├── package.json                   → (Legacy or root Node metadata)

├── package-lock.json

└── README.md                      → Project documentation


## Team

  * Almog Meirov
  * Tomer Grady
  * Meir Crown



## Technologies Used

  * *Node.js + Express*
  * *C++17 (multi-threaded)*
  * *Docker + Docker Compose*
  * *JWT Authentication*
  * *Bloom Filter* for blacklist
  * *TCP Socket Communication*
#Enjoy!!
