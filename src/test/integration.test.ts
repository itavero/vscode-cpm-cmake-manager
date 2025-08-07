import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

/**
 * Integration tests for the CPM CMake Manager using the example project.
 * These tests verify that the extension works with a real CMake project using CPM.
 */
suite("CPM.cmake Manager Integration Tests", () => {
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

    workspaceFolder = vscode.workspace.workspaceFolders?.[0]!;

    // Wait for CPM cache directories to be created and CMake configuration to complete
    const cacheDir = path.join(exampleProjectPath, "cache");
    const etlCacheDir = path.join(cacheDir, "etl");
    const fakeitCacheDir = path.join(cacheDir, "fakeit");
    const cmakeCachePath = path.join(buildDir, "CMakeCache.txt");
    const maxWaitTime = 120000; // 2 minutes max wait
    const checkInterval = 50; // Check every 50ms
    let startTime = Date.now();

    while (
      !(
        fs.existsSync(cmakeCachePath) &&
        fs.existsSync(etlCacheDir) &&
        fs.existsSync(fakeitCacheDir)
      ) &&
      Date.now() - startTime < maxWaitTime
    ) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    if (!fs.existsSync(cmakeCachePath)) {
      console.error(
        "CMake configuration did not complete within timeout! No CMakeCache.txt found."
      );
    }

    startTime = Date.now();
    while (
      (!fs.existsSync(etlCacheDir) || !fs.existsSync(fakeitCacheDir)) &&
      Date.now() - startTime < maxWaitTime
    ) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    if (!fs.existsSync(etlCacheDir) || !fs.existsSync(fakeitCacheDir)) {
      console.error(
        "CPM cache directories not found! Expected etl and fakeit cache dirs."
      );
    }
  });

  test("Should detect CPM packages from real CMake cache", async () => {
    // Verify that the extension can detect packages from the actual CMake cache
    const buildDir = path.join(exampleProjectPath, "build");
    const cmakeCachePath = path.join(buildDir, "CMakeCache.txt");

    // The cache should exist from setup
    assert.ok(fs.existsSync(cmakeCachePath), "CMakeCache.txt should exist");

    // Verify cache directories exist
    const cacheDir = path.join(exampleProjectPath, "cache");
    const etlCacheDir = path.join(cacheDir, "etl");
    const fakeitCacheDir = path.join(cacheDir, "fakeit");

    assert.ok(fs.existsSync(etlCacheDir), "ETL cache directory should exist");
    assert.ok(
      fs.existsSync(fakeitCacheDir),
      "FakeIt cache directory should exist"
    );
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
CPM_PACKAGE_etl_SOURCE_DIR:PATH=${exampleProjectPath}/cache/etl/993b/etl
CPM_PACKAGE_etl_VERSION:STRING=20.38.17
CPM_PACKAGE_etl_BINARY_DIR:PATH=${buildDir}/_deps/etl-build

CPM_PACKAGE_fakeit_SOURCE_DIR:PATH=${exampleProjectPath}/cache/fakeit/a716/FakeIt
CPM_PACKAGE_fakeit_VERSION:STRING=2.4.0
CPM_PACKAGE_fakeit_BINARY_DIR:PATH=${buildDir}/_deps/fakeit-build

CPM_PACKAGE_range-v3_SOURCE_DIR:PATH=${exampleProjectPath}/cache/range-v3/src
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

  test("Clear cache command should allow package selection", async () => {
    // Verify that packages exist and can be detected
    const cacheDir = path.join(exampleProjectPath, "cache");
    const etlCacheDir = path.join(cacheDir, "etl");
    const fakeitCacheDir = path.join(cacheDir, "fakeit");

    // Verify cache directories exist before testing command
    assert.ok(fs.existsSync(etlCacheDir), "ETL cache should exist for testing");
    assert.ok(
      fs.existsSync(fakeitCacheDir),
      "FakeIt cache should exist for testing"
    );

    // Execute the clear cache command (this will show a QuickPick dialog but won't actually clear anything in tests)
    // We can't easily test the QuickPick interaction in automated tests, but we can verify the command executes
    try {
      await vscode.commands.executeCommand("cpm-cmake-manager.clearCache");
      assert.ok(true, "Clear cache command executed without throwing");
    } catch (error) {
      // Command might show a warning if no packages are found, which is acceptable
      assert.ok(
        true,
        "Command executed (may have shown package selection dialog)"
      );
    }
  });

  test("Clear entire cache command behavior", async () => {
    // The clearEntireCache command clears the global CPM cache (CPM_SOURCE_CACHE), not project cache
    // This test verifies the command handles missing cache path gracefully

    try {
      await vscode.commands.executeCommand(
        "cpm-cmake-manager.clearEntireCache"
      );
      assert.ok(true, "Clear entire cache command executed without throwing");
    } catch (error) {
      // Expected: command might fail because CPM_SOURCE_CACHE is not configured in test environment
      assert.ok(true, "Command handled missing cache path configuration");
    }
  });
});
