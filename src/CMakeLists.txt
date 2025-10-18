cmake_minimum_required(VERSION 3.10)

# Project name
project(MailProject)

# Set C++ standard
set(CMAKE_CXX_STANDARD 11)
set(CMAKE_CXX_STANDARD_REQUIRED True)

# Include directories
include_directories(src)

# Source files
set(SOURCES
    src/bloom_setup.cpp
    src/BloomFilter.cpp
    src/main.cpp
    src/TCP_Server.cpp
    src/URLChecker.cpp
    src/UrlListUtils.cpp
    src/UrlStorage.cpp
    src/InfiniteCommandLoop.cpp
)

# Add executable
add_executable(MailProject ${SOURCES})

# Link libraries ???????
# target_link_libraries(MailProject <library_name>)

# Add tests
enable_testing()
add_executable(FalsePositiveTest src/tests/FalsePositiveTest.cpp)
add_executable(OutputStringTest src/tests/OutputStringTest.cpp)
add_executable(PersistenceTest src/tests/PersistenceTest.cpp)
add_executable(TestBloomFilter src/tests/test_bloom_filter.cpp)
add_executable(TestConfigParser src/tests/test_config_parser.cpp)
add_executable(TestUrlList src/tests/test_url_list.cpp)
add_executable(TestOperateBloomFilter src/tests/TestOperateBloomFilter.cpp)
add_executable(TrueNegativeTest src/tests/TrueNegativeTest.cpp)
add_executable(TrueNegativeTwoHashTest src/tests/TrueNegativeTwoHashTest.cpp)
add_executable(TruePositiveTest src/tests/TruePositiveTest.cpp)
add_executable(TruePositiveTwoHashTest src/tests/TruePositiveTwoHashTest.cpp)