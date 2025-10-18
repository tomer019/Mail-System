cmake_minimum_required(VERSION 3.10)

# Project name
project(MailProject)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)

# Include directories
include_directories(src)

# Core code for all the logic and tests
add_library(CoreLogic
    src/bloom_setup.cpp
    src/BloomFilter.cpp
    src/TCP_Server.cpp
    src/URLChecker.cpp
    src/UrlListUtils.cpp
    src/UrlStorage.cpp
    src/InfiniteCommandLoop.cpp
)

target_include_directories(CoreLogic PUBLIC src)

# Add executable
add_executable(MailProject src/main.cpp)
target_link_libraries(MailProject CoreLogic pthread)

# === GTest ===
include(FetchContent)  # Enables downloading external dependencies

# Download and make GoogleTest available
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/release-1.12.1.zip
)

FetchContent_MakeAvailable(googletest)

set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
enable_testing()

# Macro to simplify test target creation
macro(add_gtest name file)
  add_executable(${name} ${file})
  target_link_libraries(${name} CoreLogic gtest gtest_main pthread)
  add_test(NAME ${name} COMMAND ${name})
endmacro()

# Add test executables
add_gtest(test_BloomFilter src/tests/test_BloomFilter.cpp)
add_gtest(test_URLChecker src/tests/test_URLChecker.cpp)
add_gtest(test_UrlStorage src/tests/test_UrlStorage.cpp)
# add_gtest(test_Integration src/tests/test_Integration.cpp)
# add_gtest(test_ClientServer src/tests/test_ClientServer.cpp)
# add_gtest(test_ClientDelete src/tests/test_ClientDelete.cpp)
# add_gtest(test_BadRequest src/tests/test_BadRequest.cpp)
# add_gtest(FalsePositiveTest src/tests/FalsePositiveTest.cpp)
# add_gtest(OutputStringTest src/tests/OutputStringTest.cpp)
# add_gtest(PersistenceTest src/tests/PersistenceTest.cpp)
# add_gtest(TestBloomFilter src/tests/test_bloom_filter.cpp)
# # add_gtest(TestConfigParser src/tests/test_config_parser.cpp)
# add_gtest(TestUrlList src/tests/test_url_list.cpp)
# add_gtest(TestOperateBloomFilter src/tests/TestOperateBloomFilter.cpp)
# add_gtest(TrueNegativeTest src/tests/TrueNegativeTest.cpp)
# add_gtest(TrueNegativeTwoHashTest src/tests/TrueNegativeTwoHashTest.cpp)
# add_gtest(TruePositiveTest src/tests/TruePositiveTest.cpp)
# add_gtest(TruePositiveTwoHashTest src/tests/TruePositiveTwoHashTest.cpp)