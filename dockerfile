# Use an official GCC compiler image
FROM gcc:12

# Set working directory
WORKDIR /app

# Copy source code and headers
COPY . .

# Compile source files into binary
RUN g++ -std=c++17 -pthread \
    src/main.cpp \
    src/BloomFilter.cpp \
    src/URLChecker.cpp \
    src/UrlListUtils.cpp \
    src/UrlStorage.cpp \
    src/bloom_setup.cpp \
    -o main_exec

# Default command
ENTRYPOINT ["./main_exec"]
