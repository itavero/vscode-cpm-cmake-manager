#include <iostream>
#include <fstream>
#include <string>

/**
 * A simple configuration file generator tool
 * This demonstrates a utility target in a subdirectory
 */

int main(int argc, char* argv[]) {
    if (argc != 2) {
        std::cerr << "Usage: " << argv[0] << " <output_file>" << std::endl;
        return 1;
    }

    std::string outputFile = argv[1];
    std::ofstream file(outputFile);
    
    if (!file.is_open()) {
        std::cerr << "Error: Could not open file " << outputFile << " for writing" << std::endl;
        return 1;
    }

    // Generate a simple configuration file
    file << "# Auto-generated configuration file\n";
    file << "project_name=CMakeLanguageModelToolsExample\n";
    file << "version=1.0.0\n";
    file << "debug_mode=true\n";
    file << "log_level=info\n";

    file.close();
    std::cout << "Configuration file generated: " << outputFile << std::endl;
    
    return 0;
}
