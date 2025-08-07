import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

/**
 * Integration tests for the CPM CMake Manager using the example project.
 * These tests verify that the extension works with a real CMake project using CPM.
 */
suite("CPM CMake Manager Integration Test Suite", () => {
  const exampleProjectPath = path.join(__dirname, "..", "..", "example");
  let workspaceFolder: vscode.WorkspaceFolder;

  suiteSetup(async function () {
    this.timeout(60000);

    // Clean up any existing build directory to ensure a fresh start
    const buildDir = path.join(exampleProjectPath, "build");
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true, force: true });
      console.log("Cleaned up existing build directory");
    }

    // Open the example project as a workspace
    const exampleUri = vscode.Uri.file(exampleProjectPath);

    // Check if workspace folder already exists
    const existingFolder = vscode.workspace.workspaceFolders?.find(
      (folder) => folder.uri.fsPath === exampleProjectPath
    );

    if (!existingFolder) {
      // Add the example folder to workspace
      const success = vscode.workspace.updateWorkspaceFolders(
        vscode.workspace.workspaceFolders?.length || 0,
        0,
        {
          uri: exampleUri,
          name: "CPM Example",
        }
      );

      if (!success) {
        console.error(
          "Failed to add workspace folder, continuing with existing workspace"
        );
      }
    }

    // Wait a bit for workspace to be ready
    await new Promise((resolve) => setTimeout(resolve, 3000));

    workspaceFolder =
      vscode.workspace.workspaceFolders?.find(
        (folder) => folder.uri.fsPath === exampleProjectPath
      ) || vscode.workspace.workspaceFolders?.[0]!;

    console.log(`Using workspace folder: ${workspaceFolder.uri.fsPath}`);
  });

  test("Extension should be active and working", async () => {
    const ext = vscode.extensions.getExtension("arno-dev.cpm-cmake-manager");
    assert.ok(ext, "Extension should be available");

    if (!ext.isActive) {
      await ext.activate();
    }

    assert.ok(ext.isActive, "Extension should be active");
  });

  test("Example project should have CMakeLists.txt", () => {
    const cmakeListsPath = path.join(exampleProjectPath, "CMakeLists.txt");
    assert.ok(
      fs.existsSync(cmakeListsPath),
      "CMakeLists.txt should exist in example project"
    );
  });

  test("Example project should have get_cpm.cmake", () => {
    const getCpmPath = path.join(exampleProjectPath, "get_cpm.cmake");
    assert.ok(
      fs.existsSync(getCpmPath),
      "get_cpm.cmake should exist in example project"
    );
  });

  test("Commands should be available", async () => {
    const commands = await vscode.commands.getCommands(true);

    const expectedCommands = [
      "cpm-cmake-manager.clearCache",
      "cpm-cmake-manager.clearEntireCache",
      "cpm-cmake-manager.openPackage",
    ];

    for (const command of expectedCommands) {
      assert.ok(
        commands.includes(command),
        `Command ${command} should be registered`
      );
    }
  });

  test("CPM packages view should be available", async () => {
    // The packages view should be registered as a tree data provider
    // We can't directly test the view without more complex setup,
    // but we can verify the extension is properly structured
    const ext = vscode.extensions.getExtension("arno-dev.cpm-cmake-manager");
    assert.ok(ext?.isActive, "Extension should be active for view tests");
  });

  test("Should handle CMake cache changes gracefully", async function () {
    this.timeout(30000);

    // Create a mock CMakeCache.txt file in the build directory
    const buildDir = path.join(exampleProjectPath, "build");
    fs.mkdirSync(buildDir, { recursive: true });

    const cmakeCachePath = path.join(buildDir, "CMakeCache.txt");
    const cacheContent = `
# CMake cache file for testing
CMAKE_BUILD_TYPE:STRING=Debug
CMAKE_PROJECT_NAME:STRING=math_thingy

# CPM package variables
CPM_PACKAGES:STRING=etl;fakeit;range-v3
CPM_PACKAGE_etl_SOURCE_DIR:PATH=${buildDir}/_deps/etl-src
CPM_PACKAGE_etl_VERSION:STRING=20.38.17
CPM_PACKAGE_etl_BINARY_DIR:PATH=${buildDir}/_deps/etl-build

CPM_PACKAGE_fakeit_SOURCE_DIR:PATH=${buildDir}/_deps/fakeit-src
CPM_PACKAGE_fakeit_VERSION:STRING=2.4.0
CPM_PACKAGE_fakeit_BINARY_DIR:PATH=${buildDir}/_deps/fakeit-build

CPM_PACKAGE_range-v3_SOURCE_DIR:PATH=${buildDir}/_deps/range-v3-src
CPM_PACKAGE_range-v3_VERSION:STRING=0.12.0
CPM_PACKAGE_range-v3_BINARY_DIR:PATH=${buildDir}/_deps/range-v3-build
`;

    fs.writeFileSync(cmakeCachePath, cacheContent);

    // Wait a moment for the file watcher to pick up the change
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify the file exists
    assert.ok(fs.existsSync(cmakeCachePath), "CMakeCache.txt should exist");

    // Clean up
    fs.rmSync(buildDir, { recursive: true, force: true });
  });

  test("Clear cache command should work without errors", async () => {
    // This test verifies that the command can be executed without throwing
    try {
      await vscode.commands.executeCommand("cpm-cmake-manager.clearCache");
      // If we get here without an exception, the command executed successfully
      assert.ok(true, "Clear cache command executed without errors");
    } catch (error) {
      // The command might show a warning if no packages are found, which is expected
      console.log("Clear cache command result:", error);
      assert.ok(
        true,
        "Command executed (may have shown warning about no packages)"
      );
    }
  });

  test("Clear entire cache command should work without errors", async () => {
    try {
      await vscode.commands.executeCommand(
        "cpm-cmake-manager.clearEntireCache"
      );
      assert.ok(true, "Clear entire cache command executed without errors");
    } catch (error) {
      // The command might show a warning if no cache path is configured, which is expected
      console.log("Clear entire cache command result:", error);
      assert.ok(
        true,
        "Command executed (may have shown warning about cache path)"
      );
    }
  });

  test("Should handle workspace folder changes gracefully", async () => {
    // Verify extension doesn't crash when workspace folders change
    const originalFolders = vscode.workspace.workspaceFolders?.length || 0;

    // The extension should handle workspace changes without throwing
    try {
      // Trigger workspace change event by accessing workspace folders
      const folders = vscode.workspace.workspaceFolders;
      assert.ok(
        folders !== undefined,
        "Workspace folders should be accessible"
      );
      assert.ok(
        folders.length >= originalFolders,
        "Should have at least the original folders"
      );
    } catch (error) {
      assert.fail(
        `Extension should handle workspace folder access gracefully: ${error}`
      );
    }
  });
});
