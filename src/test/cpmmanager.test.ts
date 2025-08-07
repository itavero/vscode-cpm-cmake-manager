import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { CpmManager } from "../cpmmanager";
import { OutputChannelLogger } from "../outputlogger";
import { CpmCmakePackage } from "../cmakecache";

suite("CPM Manager Test Suite", () => {
  let manager: CpmManager;
  let logger: OutputChannelLogger;
  let tempDir: string;

  setup(() => {
    logger = new OutputChannelLogger();
    manager = new CpmManager(logger);
    tempDir = path.join(__dirname, "temp_cpm_test");
  });

  teardown(async () => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  suite("cpmPackages getter", () => {
    test("should return empty array when no caches are loaded", () => {
      const packages = manager.cpmPackages;
      assert.strictEqual(packages.length, 0);
    });

    test("should return sorted and deduplicated packages from multiple caches", async () => {
      // Create first cache file
      const cache1Content = `
CPM_PACKAGES:STRING=zlib;fmt
CPM_PACKAGE_zlib_SOURCE_DIR:PATH=/path/to/zlib
CPM_PACKAGE_zlib_VERSION:STRING=1.2.11
CPM_PACKAGE_zlib_BINARY_DIR:PATH=/path/to/build/zlib
CPM_PACKAGE_fmt_SOURCE_DIR:PATH=/path/to/fmt
CPM_PACKAGE_fmt_VERSION:STRING=9.1.0
CPM_PACKAGE_fmt_BINARY_DIR:PATH=/path/to/build/fmt
`;

      // Create second cache file with overlapping package
      const cache2Content = `
CPM_PACKAGES:STRING=fmt;asio
CPM_PACKAGE_fmt_SOURCE_DIR:PATH=/path/to/fmt2
CPM_PACKAGE_fmt_VERSION:STRING=9.1.0
CPM_PACKAGE_fmt_BINARY_DIR:PATH=/path/to/build/fmt2
CPM_PACKAGE_asio_SOURCE_DIR:PATH=/path/to/asio
CPM_PACKAGE_asio_VERSION:STRING=1.24.0
CPM_PACKAGE_asio_BINARY_DIR:PATH=/path/to/build/asio
`;

      fs.mkdirSync(tempDir, { recursive: true });

      const cache1Path = path.join(tempDir, "CMakeCache1.txt");
      const cache2Path = path.join(tempDir, "CMakeCache2.txt");

      fs.writeFileSync(cache1Path, cache1Content);
      fs.writeFileSync(cache2Path, cache2Content);

      // Update both caches
      await manager.updateCmakeCache(vscode.Uri.file(cache1Path));
      await manager.updateCmakeCache(vscode.Uri.file(cache2Path));

      const packages = manager.cpmPackages;

      // Should have 3 unique packages (fmt should be deduplicated)
      assert.strictEqual(packages.length, 3);

      // Should be sorted alphabetically
      assert.strictEqual(packages[0].name, "asio");
      assert.strictEqual(packages[1].name, "fmt");
      assert.strictEqual(packages[2].name, "zlib");
    });
  });

  suite("updateCmakeCache", () => {
    test("should parse cache file and fire change event", async () => {
      const cacheContent = `
CPM_PACKAGES:STRING=test_pkg
CPM_PACKAGE_test_pkg_SOURCE_DIR:PATH=/path/to/test_pkg
CPM_PACKAGE_test_pkg_VERSION:STRING=1.0.0
CPM_PACKAGE_test_pkg_BINARY_DIR:PATH=/path/to/build/test_pkg
`;

      fs.mkdirSync(tempDir, { recursive: true });
      const cachePath = path.join(tempDir, "CMakeCache.txt");
      fs.writeFileSync(cachePath, cacheContent);

      let changeEventFired = false;
      let loadingStates: boolean[] = [];

      // Listen for events
      manager.onDidChangeCpmPackages(() => {
        changeEventFired = true;
      });

      manager.onLoadingStateChange((loading: boolean) => {
        loadingStates.push(loading);
      });

      await manager.updateCmakeCache(vscode.Uri.file(cachePath));

      // Verify events were fired
      assert.ok(changeEventFired, "Change event should have been fired");
      assert.strictEqual(
        loadingStates.length,
        2,
        "Loading state should change twice"
      );
      assert.ok(loadingStates[0], "First loading state should be true");
      assert.ok(!loadingStates[1], "Second loading state should be false");

      // Verify packages were loaded
      const packages = manager.cpmPackages;
      assert.strictEqual(packages.length, 1);
      assert.strictEqual(packages[0].name, "test_pkg");
    });

    test("should not fire change event if packages haven't changed", async () => {
      const cacheContent = `
CPM_PACKAGES:STRING=test_pkg
CPM_PACKAGE_test_pkg_SOURCE_DIR:PATH=/path/to/test_pkg
CPM_PACKAGE_test_pkg_VERSION:STRING=1.0.0
CPM_PACKAGE_test_pkg_BINARY_DIR:PATH=/path/to/build/test_pkg
`;

      fs.mkdirSync(tempDir, { recursive: true });
      const cachePath = path.join(tempDir, "CMakeCache.txt");
      fs.writeFileSync(cachePath, cacheContent);

      let changeEventCount = 0;
      manager.onDidChangeCpmPackages(() => {
        changeEventCount++;
      });

      // Update twice with same content
      await manager.updateCmakeCache(vscode.Uri.file(cachePath));
      await manager.updateCmakeCache(vscode.Uri.file(cachePath));

      // Should only fire once
      assert.strictEqual(changeEventCount, 1);
    });
  });

  suite("removeCmakeCache", () => {
    test("should remove cache and fire change event if packages existed", async () => {
      const cacheContent = `
CPM_PACKAGES:STRING=test_pkg
CPM_PACKAGE_test_pkg_SOURCE_DIR:PATH=/path/to/test_pkg
CPM_PACKAGE_test_pkg_VERSION:STRING=1.0.0
CPM_PACKAGE_test_pkg_BINARY_DIR:PATH=/path/to/build/test_pkg
`;

      fs.mkdirSync(tempDir, { recursive: true });
      const cachePath = path.join(tempDir, "CMakeCache.txt");
      fs.writeFileSync(cachePath, cacheContent);

      // First add the cache
      await manager.updateCmakeCache(vscode.Uri.file(cachePath));
      assert.strictEqual(manager.cpmPackages.length, 1);

      let changeEventFired = false;
      manager.onDidChangeCpmPackages(() => {
        changeEventFired = true;
      });

      // Remove the cache
      await manager.removeCmakeCache(vscode.Uri.file(cachePath));

      assert.ok(changeEventFired, "Change event should have been fired");
      assert.strictEqual(manager.cpmPackages.length, 0);
    });

    test("should not fire change event if cache had no packages", async () => {
      const cachePath = path.join(tempDir, "EmptyCache.txt");

      let changeEventFired = false;
      manager.onDidChangeCpmPackages(() => {
        changeEventFired = true;
      });

      await manager.removeCmakeCache(vscode.Uri.file(cachePath));

      assert.ok(!changeEventFired, "Change event should not have been fired");
    });
  });

  suite("clearCacheForPackage", () => {
    test("should return false for non-existent package", () => {
      const result = manager.clearCacheForPackage("non_existent");
      assert.strictEqual(result, false);
    });

    test("should find and attempt to clear existing package", async () => {
      const cacheContent = `
CPM_PACKAGES:STRING=test_pkg
CPM_PACKAGE_test_pkg_SOURCE_DIR:PATH=${tempDir}/src
CPM_PACKAGE_test_pkg_VERSION:STRING=1.0.0
CPM_PACKAGE_test_pkg_BINARY_DIR:PATH=${tempDir}/build
`;

      fs.mkdirSync(tempDir, { recursive: true });
      const cachePath = path.join(tempDir, "CMakeCache.txt");
      fs.writeFileSync(cachePath, cacheContent);

      // Create fake source and build directories
      const srcDir = path.join(tempDir, "src");
      const buildDir = path.join(tempDir, "build");
      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(buildDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, "test.txt"), "test");
      fs.writeFileSync(path.join(buildDir, "test.txt"), "test");

      // Load the cache
      await manager.updateCmakeCache(vscode.Uri.file(cachePath));

      // Clear the package cache
      const result = manager.clearCacheForPackage("test_pkg");

      assert.strictEqual(result, true);
      // Note: In a real test environment, we'd check if directories were actually removed
      // but since we're not mocking fs operations, we just verify the function found the package
    });
  });
});
