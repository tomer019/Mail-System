import socket
import time

RETRY_ATTEMPTS = 5  # Number of connection retry attempts
RETRY_DELAY = 2  # seconds


class TCPClient:
    def __init__(self, host, port):
        self.host = host
        self.port = port
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.connected = False  # Connection status

    def connect(self):
        for attempt in range(1, RETRY_ATTEMPTS + 1):
            try:
                self.socket.connect((self.host, self.port))
                self.connected = True
                return True
            except (ConnectionRefusedError, socket.timeout) as e:
                print(f"[Error] {e}")
                time.sleep(RETRY_DELAY)
        print("Failed to connect after retries.")
        return False

    def send_command(self, command):
        self.socket.sendall((command + "\n").encode())
        return self.socket.recv(1024).decode()

    def close(self):
        self.socket.close()
