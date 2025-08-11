import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import {
  readCMakeCacheFile,
  getCpmPackages,
  CpmCmakePackage,
} from "../cmakecache";

suite("CMake Cache Test Suite", () => {
  suite("readCMakeCacheFile", () => {
    test("should extract CPM variables from cache file", async () => {
      // Create a temporary CMakeCache.txt content with CPM variables
      const cacheContent = `
# This is a comment
CMAKE_BUILD_TYPE:STRING=Debug
CPM_PACKAGES:STRING=nlohmann_json;fmt
CPM_PACKAGE_nlohmann_json_SOURCE_DIR:PATH=/path/to/nlohmann_json
CPM_PACKAGE_nlohmann_json_VERSION:STRING=3.11.2
CPM_PACKAGE_nlohmann_json_BINARY_DIR:PATH=/path/to/build/nlohmann_json
CPM_PACKAGE_fmt_SOURCE_DIR:PATH=/path/to/fmt
CPM_PACKAGE_fmt_VERSION:STRING=9.1.0
CPM_PACKAGE_fmt_BINARY_DIR:PATH=/path/to/build/fmt
SOME_OTHER_VAR:STRING=value
`;

      // Write to a temporary file
      const tempDir = path.join(__dirname, "temp");
      const tempFile = path.join(tempDir, "CMakeCache.txt");
      const tempUri = vscode.Uri.file(tempFile);

      try {
        // Create directory and file
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(tempDir));
        await vscode.workspace.fs.writeFile(
          tempUri,
          Buffer.from(cacheContent, "utf8")
        );

        // Read the cache file
        const variables = await readCMakeCacheFile(tempUri);

        // Verify CPM variables are extracted
        assert.strictEqual(variables.size, 7);
        assert.ok(variables.has("CPM_PACKAGES"));
        assert.strictEqual(variables.get("CPM_PACKAGES"), "nlohmann_json;fmt");
        assert.ok(variables.has("CPM_PACKAGE_nlohmann_json_SOURCE_DIR"));
        assert.strictEqual(
          variables.get("CPM_PACKAGE_nlohmann_json_SOURCE_DIR"),
          "/path/to/nlohmann_json"
        );
        assert.ok(variables.has("CPM_PACKAGE_nlohmann_json_VERSION"));
        assert.strictEqual(
          variables.get("CPM_PACKAGE_nlohmann_json_VERSION"),
          "3.11.2"
        );
        assert.ok(variables.has("CPM_PACKAGE_fmt_SOURCE_DIR"));
        assert.ok(variables.has("CPM_PACKAGE_fmt_VERSION"));
        assert.ok(variables.has("CPM_PACKAGE_nlohmann_json_BINARY_DIR"));
        assert.ok(variables.has("CPM_PACKAGE_fmt_BINARY_DIR"));

        // Verify non-CPM variables are not included
        assert.ok(!variables.has("CMAKE_BUILD_TYPE"));
        assert.ok(!variables.has("SOME_OTHER_VAR"));
      } finally {
        // Clean up
        try {
          await vscode.workspace.fs.delete(tempUri);
          await vscode.workspace.fs.delete(vscode.Uri.file(tempDir));
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });

    test("should handle files with no CPM variables", async () => {
      const cacheContent = `
# This is a comment
CMAKE_BUILD_TYPE:STRING=Debug
SOME_OTHER_VAR:STRING=value
`;

      const tempDir = path.join(__dirname, "temp2");
      const tempFile = path.join(tempDir, "CMakeCache.txt");
      const tempUri = vscode.Uri.file(tempFile);

      try {
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(tempDir));
        await vscode.workspace.fs.writeFile(
          tempUri,
          Buffer.from(cacheContent, "utf8")
        );

        const variables = await readCMakeCacheFile(tempUri);

        assert.strictEqual(variables.size, 0);
      } finally {
        try {
          await vscode.workspace.fs.delete(tempUri);
          await vscode.workspace.fs.delete(vscode.Uri.file(tempDir));
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });
  });

  suite("getCpmPackages", () => {
    test("should create CPM packages from cache variables", () => {
      const cacheVariables = new Map<string, string>([
        ["CPM_PACKAGES", "nlohmann_json;fmt"],
        ["CPM_PACKAGE_nlohmann_json_SOURCE_DIR", "/path/to/nlohmann_json"],
        ["CPM_PACKAGE_nlohmann_json_VERSION", "3.11.2"],
        [
          "CPM_PACKAGE_nlohmann_json_BINARY_DIR",
          "/path/to/build/nlohmann_json",
        ],
        ["CPM_PACKAGE_fmt_SOURCE_DIR", "/path/to/fmt"],
        ["CPM_PACKAGE_fmt_VERSION", "9.1.0"],
        ["CPM_PACKAGE_fmt_BINARY_DIR", "/path/to/build/fmt"],
      ]);

      const packages = getCpmPackages(cacheVariables);

      assert.strictEqual(packages.length, 2);

      const nlohmann = packages.find(
        (p: CpmCmakePackage) => p.name === "nlohmann_json"
      );
      assert.ok(nlohmann);
      assert.strictEqual(nlohmann.version, "3.11.2");
      assert.strictEqual(nlohmann.sourceDir, "/path/to/nlohmann_json");
      assert.strictEqual(nlohmann.buildDir, "/path/to/build/nlohmann_json");

      const fmt = packages.find((p: CpmCmakePackage) => p.name === "fmt");
      assert.ok(fmt);
      assert.strictEqual(fmt.version, "9.1.0");
      assert.strictEqual(fmt.sourceDir, "/path/to/fmt");
      assert.strictEqual(fmt.buildDir, "/path/to/build/fmt");
    });

    test("should handle packages without version", () => {
      const cacheVariables = new Map<string, string>([
        ["CPM_PACKAGES", "mylib"],
        ["CPM_PACKAGE_mylib_SOURCE_DIR", "/path/to/mylib"],
        ["CPM_PACKAGE_mylib_BINARY_DIR", "/path/to/build/mylib"],
      ]);

      const packages = getCpmPackages(cacheVariables);

      assert.strictEqual(packages.length, 1);
      assert.strictEqual(packages[0].name, "mylib");
      assert.strictEqual(packages[0].version, undefined);
      assert.strictEqual(packages[0].sourceDir, "/path/to/mylib");
      assert.strictEqual(packages[0].buildDir, "/path/to/build/mylib");
    });

    test("should handle packages with missing directories", () => {
      const cacheVariables = new Map<string, string>([
        ["CPM_PACKAGES", "incomplete"],
        ["CPM_PACKAGE_incomplete_SOURCE_DIR", "/path/to/incomplete"],
        // Missing BINARY_DIR
      ]);

      const packages = getCpmPackages(cacheVariables);

      // Should not create package when required directories are missing
      assert.strictEqual(packages.length, 0);
    });

    test("should return empty array for empty cache", () => {
      const cacheVariables = new Map<string, string>();
      const packages = getCpmPackages(cacheVariables);
      assert.strictEqual(packages.length, 0);
    });
  });

  suite("CpmCmakePackage", () => {
    test("should create package with all properties", () => {
      const pkg = new CpmCmakePackage("test", "1.0.0", "/src", "/build");

      assert.strictEqual(pkg.name, "test");
      assert.strictEqual(pkg.version, "1.0.0");
      assert.strictEqual(pkg.sourceDir, "/src");
      assert.strictEqual(pkg.buildDir, "/build");
      assert.strictEqual(pkg.versionString, "v1.0.0");
    });

    test("should handle undefined version", () => {
      const pkg = new CpmCmakePackage("test", undefined, "/src", "/build");

      assert.strictEqual(pkg.version, undefined);
      assert.strictEqual(pkg.versionString, undefined);
    });

    test("should handle empty version", () => {
      const pkg = new CpmCmakePackage("test", "", "/src", "/build");

      assert.strictEqual(pkg.versionString, undefined);
    });

    test("should handle version '0'", () => {
      const pkg = new CpmCmakePackage("test", "0", "/src", "/build");

      assert.strictEqual(pkg.versionString, undefined);
    });

    test("should correctly compare packages for equality", () => {
      const pkg1 = new CpmCmakePackage("test", "1.0.0", "/src", "/build");
      const pkg2 = new CpmCmakePackage("test", "1.0.0", "/src", "/build");
      const pkg3 = new CpmCmakePackage("test", "2.0.0", "/src", "/build");
      const pkg4 = new CpmCmakePackage("other", "1.0.0", "/src", "/build");

      assert.ok(pkg1.equals(pkg2));
      assert.ok(!pkg1.equals(pkg3));
      assert.ok(!pkg1.equals(pkg4));
    });
  });
});
