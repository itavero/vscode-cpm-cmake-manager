# CPM.cmake Manager

Provides an easy way to manage packages included using CPM.cmake from within Visual Studio Code.

## Features

* Show list of packages included using CPM.cmake in the Explorer view
  * Each entry has a button to open the source directory of the package in a new window
  * In case it is a Git repository, it will also try to fetch the latest tags from the remote repository and show if a newer version is available
* Provides a command to clean individual packages from the CPM.cmake source cache
* Provides a command to clean to global CPM.cmake source cache, which also triggers a clean and reconfigure of the CMake project
* **Copilot Integration**: Exposes CPM package information to GitHub Copilot for enhanced AI assistance
  * Copilot can provide insights about your project's dependencies
  * Get intelligent suggestions about package versions, updates, and compatibility
  * Access package details directly through chat interactions

## Copilot Integration

This extension integrates with GitHub Copilot to provide intelligent assistance with your CPM.cmake packages. When you use Copilot Chat, it has access to:

* Complete list of CPM packages in your project
* Package names, versions, and source/build directories
* Git repository information for packages
* Update status and latest available versions

You can ask Copilot questions like:

* "What CPM packages are used in this project?"
* "Are there any outdated packages that need updating?"
* "Show me information about all my dependencies"

## Some things I might add in the future

* Show link to package's Git repository in the package list
* Ability to turn off automatic check for newer versions
* Ability to manually trigger to check for newer versions
