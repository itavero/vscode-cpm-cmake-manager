# CPM.cmake Manager

Provides an easy way to manage packages included using CPM.cmake from within Visual Studio Code.

## Features

* Show list of packages included using CPM.cmake in the Explorer view
  * Each entry has a button to open the source directory of the package in a new window
  * In case it is a Git repository, it will also try to fetch the latest tags from the remote repository and show if a newer version is available
* Provides a command to clean individual packages from the CPM.cmake source cache
* Provides a command to clean to global CPM.cmake source cache, which also triggers a clean and reconfigure of the CMake project

## Some things I might add in the future

* Show link to package's Git repository in the package list
* Ability to turn off automatic check for newer versions
* Ability to manually trigger to check for newer versions

## Thanks to

* The contributors of the [CPM.cmake](https://github.com/cpm-cmake/CPM.cmake) project for providing such a useful tool.
  * Also thanks to [@TheLartians](https://github.com/TheLartians) in particular for starting the project and making the logo (which I also incorporated into the icon of this extension).
* The maintainers of the [CMake Tools extension](https://github.com/microsoft/vscode-cmake-tools) for making CMake easy to work with in VS Code.
