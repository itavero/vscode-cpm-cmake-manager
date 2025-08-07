cmake_minimum_required(VERSION 3.10)
project(CMakeLanguageModelToolsExample VERSION 1.0.0)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(MY_CUSTOM_VAR "Hi Copilot!" CACHE STRING "A custom variable for demonstration purposes")

if(DEFINED CACHE{MY_CUSTOM_BOOLEAN})
  message(STATUS "MY_CUSTOM_BOOLEAN is defined in the cache, so a cache is being used.")
endif()

set(MY_CUSTOM_BOOLEAN ON CACHE BOOL "A custom boolean variable for demonstration purposes")

# Add executable
add_executable(hello_world
  src/main.cpp
  src/greetings.cpp
)

# Add include directory
target_include_directories(hello_world PRIVATE include)

# Add a library
add_library(math_utils STATIC
  src/math_utils.cpp
)

target_include_directories(math_utils PRIVATE include)

# Link library to executable
target_link_libraries(hello_world math_utils)

# Add custom target for documentation
add_custom_target(docs
  COMMAND echo "Generating documentation..."
  COMMENT "Generate project documentation"
)

# Messages to check for in the automatied tests
message(STATUS "LANGUAGE MODEL: This should end up in the std output of the test")
message(NOTICE "LANGUAGE MODEL: This is an important message in the std err output.")

# Add subdirectories
add_subdirectory(sub_dir_with_a_target)

# Installation rules
install(TARGETS hello_world
  DESTINATION bin
)

install(TARGETS math_utils
  DESTINATION lib
)
