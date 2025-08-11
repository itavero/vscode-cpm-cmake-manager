cmake_minimum_required(VERSION 3.28)
project(vscode-example VERSION 1.0.0)

# Set CPM.cmake cache directory to a local folder, so we can access it for testing.
set(ENV{CPM_SOURCE_CACHE} "${CMAKE_SOURCE_DIR}/cache")
set(ENV{CPM_USE_NAMED_CACHE_DIRECTORIES} ON)

# Set C++ standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Include CPM.cmake
include(get_cpm.cmake)
CPMAddPackage("gh:ETLCPP/etl#20.42.2")
CPMAddPackage("gh:eranpeer/FakeIt#2.4.1")

# Add executable
add_executable(math_thingy
  src/main.cpp
)

# Add include directory
target_include_directories(math_thingy PRIVATE include)

# Add a library
add_library(math_utils STATIC
  src/math_utils.cpp
)

target_include_directories(math_utils PRIVATE include)

# Link library to executable
target_link_libraries(math_thingy math_utils)
