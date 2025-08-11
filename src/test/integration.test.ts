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
  const buildDir = path.join(exampleProjectPath, "build");

  suiteSetup(async function () {
    this.timeout(60000);

    // Set CPM_SOURCE_CACHE to our test cache directory
    process.env.CPM_SOURCE_CACHE = sourceCacheDir;
    console.log(`Set CPM_SOURCE_CACHE to: ${sourceCacheDir}`);

    // Clean up any existing build and cache directories to ensure a fresh start
    if (fs.existsSync(this.buildDir)) {
      fs.rmSync(this.buildDir, { recursive: true, force: true });
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

    // Wait for CPM cache directories to be created and CMake configuration to complete
    const etlCacheDir = path.join(sourceCacheDir, "etl");
    const fakeItCacheDir = path.join(sourceCacheDir, "fakeit");
    const buildDir = path.join(exampleProjectPath, "build");
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

  setup(async () => {
    // Make sure that cache is ready. If not, trigger configure actions of cmake tools extension first.
    const etlCacheDir = path.join(sourceCacheDir, "etl");
    const fakeItCacheDir = path.join(sourceCacheDir, "fakeit");
    const cmakeCachePath = path.join(buildDir, "CMakeCache.txt");
    if (!fs.existsSync(etlCacheDir) || !fs.existsSync(fakeItCacheDir)) {
      vscode.commands.executeCommand("cmake.configure");
    }

    // Wait for cache directories to be created
    const maxWaitTime = 120000; // 2 minutes max wait
    const checkInterval = 50; // Check every 50ms
    let startTime = Date.now();

    while (
      !(
        fs.existsSync(etlCacheDir) &&
        fs.existsSync(fakeItCacheDir) &&
        fs.existsSync(cmakeCachePath)
      ) &&
      Date.now() - startTime < maxWaitTime
    ) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    assert.ok(fs.existsSync(cmakeCachePath), "CMakeCache.txt should exist");
  });

  suiteTeardown(() => {
    delete process.env.CPM_SOURCE_CACHE;
  });

  test.skip("Clear cache command should be available when packages exist", async function () {
    this.timeout(30000);

    const etlDir = path.join(sourceCacheDir, "etl");
    const fakeItDir = path.join(sourceCacheDir, "fakeit");

    // Mock the QuickPick to simulate user selecting only "fakeit"
    const originalShowQuickPick = vscode.window.showQuickPick;
    let quickPickItems: string[] | undefined;

    const mockShowQuickPick = async (items: any[], options?: any) => {
      // Capture the items shown in the QuickPick
      quickPickItems = Array.isArray(items) ? items : [];

      // Simulate user selecting only "FakeIt" (but we need to return the exact item)
      // The extension expects an array of strings when canPickMany is true
      return ["FakeIt"];
    };

    // Replace the showQuickPick method
    (vscode.window as any).showQuickPick = mockShowQuickPick;

    try {
      // Wait a bit for the extension to process the CMake cache
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Execute the clear cache command
      await vscode.commands.executeCommand("cpm-cmake-manager.clearCache");

      // Verify that both packages were shown in the QuickPick
      assert.ok(quickPickItems, "QuickPick should have been shown");
      assert.ok(
        quickPickItems!.includes("etl"),
        "ETL package should be in the selection list"
      );
      assert.ok(
        quickPickItems!.includes("FakeIt"),
        "FakeIt package should be in the selection list"
      );

      // Wait for FakeIt directory to be removed (up to 10 seconds)
      let fakeItRemoved = false;
      const maxWaitTime = 10000; // 10 seconds max wait
      const checkInterval = 100; // Check every 100ms
      let startTime = Date.now();
      console.log(JSON.stringify(quickPickItems));

      while (!fakeItRemoved && Date.now() - startTime < maxWaitTime) {
        // Fake It is considered removed if there's no more subdirectories in fakeItDir (there might be other files)
        fakeItRemoved = fs.readdirSync(fakeItDir).length === 0;
        if (!fakeItRemoved) {
          await new Promise((resolve) => setTimeout(resolve, checkInterval));
        }
      }

      // Verify results
      assert.ok(fakeItRemoved, "FakeIt cache directory should be removed");
      assert.ok(
        fs.existsSync(etlDir),
        "ETL cache directory should still exist"
      );
    } finally {
      // Restore original showQuickPick method
      (vscode.window as any).showQuickPick = originalShowQuickPick;
    }
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
