# Use an official GCC compiler image
FROM gcc:12

# Install any dependencies you need (cmake ירד כי לא צריך אותו יותר)
RUN apt-get update && apt-get install -y \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy all files into the container
COPY . .

# Compile only specific .cpp files
RUN g++ -std=c++17 -pthread \
    src/main.cpp \
    src/BloomFilter.cpp \
    src/URLChecker.cpp \
    src/UrlListUtils.cpp \
    src/UrlStorage.cpp \
    src/bloom_setup.cpp \
    -o main_exec

# Command to run when container starts
CMD ["./main_exec"]
