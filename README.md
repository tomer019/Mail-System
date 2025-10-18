# Mail

## Purpose

In this part of the project, we developed a client-server system for managing URL data using a Bloom Filter. The code was structured with a modular design and adherence to SOLID principles, especially the Open/Closed Principle. We containerized the system with Docker, ensuring clean separation between services. Connection handling, error responses, and client-server communication were thoroughly tested and refined.

---

## Project Structure

```
/src        - Source files (C++.cpp, C++.h, Python)
/tests      - Test files 
/data       - Data files (e.g., urls.txt, bloom_state.bin )
/client -     client files - client.py, tcp_client.py
/Dockerfile - Docker setup, docker-compose...
/README.md  - Project documentation
```

---

## Build and Run Instructions

### Open the First Terminal:
### Build the Docker image

```bash
docker-compose up --build -d
```

### Start the Server
1. In order to run the server, we need to know the name of the server container. For that, the next command you need to run is the following one:

```bash
docker ps
```
2. Look for the name of the server's container. It should be something like this:

```bash
mail-server-1
```
> **Note:** The name of the client's container appears here as well (e.g., `mail-client-1`). You'll need it to run the client later.

3. Now you can run the server with the name you got. If the container's name is mail-server-1, you should run the following:

```bash
docker exec -it mail-server-1 ./build/MailProject 0.0.0.0 8080 256 8 8
```
> **Note:**
- In this example, `256 8 8` is the Bloom Filter configuration line, which must be provided when starting the server. You don't have to use this specific configuration line, but you must provide one.
- You don't have to use port `8080` either - you can run the server with any port you want, as long as it is available.

### Now open a second Terminal:

### Run the Client
1. Run the following command using the container's name you found earlier:

```bash
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' mail-server-1
```
2. You will get an IP address. Copy the result (e.g., `172.19.0.2`) and run the following command:

```bash
docker exec -it mail-client-1 python3 client.py 172.19.0.2 8080
```
Replace the client container's name, IP and port with the client container's name and IP you got and the same port used in the server.


### To stop all running containers, remove the server container, and free the bound port:

```bash
docker-compose down
```

**optional:**
### Activate the tests ()
```bash
docker-compose run --rm tests
```

> **Important:**  
 - client will automatically try to connect to the server container using the internal Docker network.

- Input must follow the format: `COMMAND URL` (e.g. `POST www.google.com`).

- Invalid commands or malformed URLs will result in a 400 Bad Request response.

---

## Expected Input

 **URL Commands**:
  After using build and run instructions, you can add or query URLs interactively in the client terminal:
  <br>
  Adding URL:
  ```
  POST <URL>
  ```
  Checking if URL is in list:
  ```
  GET <URL>
  ```
  Delete the URL from list:
  ```
  DELETE <URL>
  ```
  Only valid URLs can be added.
---

## Example Run

  ```
hdtrhy
400 Bad Request
GET www.google.com
200 Ok

false
POST www.A.com
201 Created
GET www.A.com
200 Ok

true true
DELETE www.AB.com
204 No Content
DELETE www.A.com
204 No Content
GET www.A.com
200 Ok

true false

  ```

---
# Design Principles
This system was designed with SOLID principles in mind, particularly:

Open/Closed Principle (OCP):
The codebase is open for extension but closed for modification.
New command types (e.g., SHUTDOWN, STATS) can be added by introducing new handler functions without modifying existing logic in the command loop.

Modular Command Handling:
Commands are parsed and validated separately. Logic for POST, GET, and DELETE operations is encapsulated, allowing new operations to be introduced easily without breaking existing behavior.

Extensibility Strategy:
Input parsing and validation are designed with flexibility, allowing commands like "SHUTDOWN www.site.com" or "STATS bloom" to be recognized in the future.

This ensures long-term maintainability and adaptability for future use cases without requiring structural rewrites.


## Notes

- Data files are located under the `/data` directory.
- The application expects to find (or create) `urls.txt` at `../data/urls.txt` relative to the executable's runtime location.
- If the file does not exist, it will be created automatically.

---

## Authors

- Developed by Almog Meirov, Tomer Grady, Meir Crown

---

## Technologies Used

- **C++17** - Core server-side logic and Bloom Filter implementation.
- **Docker & Docker Compose** - Containerized setup for consistent cross-platform execution of both client and server.
- **Python 3.0** - Lightweight TCP client for sending requests and receiving responses.
- **Bloom Filter Data Structure** - Probabilistic data structure used to check for membership efficiently
- **Regex-based URL validation** - Ensures incoming URLs follow standard syntax before processing.
- **Clien-server interface** - Line-based text protocol over TCP sockets, supporting POST/GET/DELETE operations.
✅ This documentation has been tested by a peer to ensure clarity and completeness.

---

# Enjoy!
