import sys
from tcp_client import TCPClient


def main():
    if len(sys.argv) != 3:
        print("Usage: python client.py <server_ip> <port>")
        return

    host = sys.argv[1]
    port = int(sys.argv[2])

    client = TCPClient(host, port)
    if not client.connect():
        print("Failed to connect. Exiting.")
        return

    try:
        while True:
            command = input().strip()
            if not command:
                continue
            response = client.send_command(command)
            if not response:
                print("Server closed the connection.")
                break
            print(f"{response}", end="")
    except KeyboardInterrupt:
        print("")
    finally:
        client.close()


if __name__ == "__main__":
    main()
