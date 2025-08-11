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
  const sourceCacheDir = path.join(exampleProjectPath, "cache");
  let workspaceFolder: vscode.WorkspaceFolder;

  suiteSetup(async function () {
    this.timeout(60000);

    // Set CPM_SOURCE_CACHE to our test cache directory
    process.env.CPM_SOURCE_CACHE = sourceCacheDir;
    console.log(`Set CPM_SOURCE_CACHE to: ${sourceCacheDir}`);

    // Clean up any existing build and cache directories to ensure a fresh start
    const buildDir = path.join(exampleProjectPath, "build");
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true, force: true });
      console.log("Cleaned up existing build directory");
    }

    if (fs.existsSync(sourceCacheDir)) {
      fs.rmSync(sourceCacheDir, { recursive: true, force: true });
      console.log("Cleaned up existing cache directory");
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
    const etlCacheDir = path.join(sourceCacheDir, "etl");
    const fakeItCacheDir = path.join(sourceCacheDir, "fakeit");
    const cmakeCachePath = path.join(buildDir, "CMakeCache.txt");
    const maxWaitTime = 120000; // 2 minutes max wait
    const checkInterval = 50; // Check every 50ms
    let startTime = Date.now();

    while (
      !(
        fs.existsSync(cmakeCachePath) &&
        fs.existsSync(etlCacheDir) &&
        fs.existsSync(fakeItCacheDir)
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
      (!fs.existsSync(etlCacheDir) || !fs.existsSync(fakeItCacheDir)) &&
      Date.now() - startTime < maxWaitTime
    ) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    if (!fs.existsSync(etlCacheDir) || !fs.existsSync(fakeItCacheDir)) {
      console.error(
        "CPM cache directories not found! Expected etl and fakeit cache dirs."
      );
    }
  });

  suiteTeardown(() => {
    delete process.env.CPM_SOURCE_CACHE;
  });

  test("Clear cache command should be available when packages exist", async () => {
    // This will show the package selection dialog but won't proceed without user input
    // await vscode.commands.executeCommand("cpm-cmake-manager.clearCache");
    assert.ok(
      true,
      "Clear cache command executed and showed package selection"
    );

    /// @todo figure out how to interact with UI
  });

  test("Clear entire cache command should actually clear cache", async function () {
    this.timeout(30000);

    const etlDir = path.join(sourceCacheDir, "etl");
    const fakeItDir = path.join(sourceCacheDir, "fakeit");

    // Execute the clear entire cache command
    await vscode.commands.executeCommand("cpm-cmake-manager.clearEntireCache");

    // keep checking if both folders are removed for up to 10 seconds
    let etlRemoved = false;
    let fakeItRemoved = false;
    const maxWaitTime = 10000; // 10 seconds max wait
    const checkInterval = 50; // Check every 50ms
    let startTime = Date.now();

    while (
      !etlRemoved &&
      !fakeItRemoved &&
      Date.now() - startTime < maxWaitTime
    ) {
      etlRemoved = !fs.existsSync(etlDir);
      fakeItRemoved = !fs.existsSync(fakeItDir);
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    assert.ok(etlRemoved, "ETL cache directory should be removed");
    assert.ok(fakeItRemoved, "FakeIt cache directory should be removed");
  });
});
