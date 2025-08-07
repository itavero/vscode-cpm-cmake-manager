import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Extension should be present", () => {
    assert.ok(vscode.extensions.getExtension("arno-dev.cpm-cmake-manager"));
  });

  test("Extension should activate", async () => {
    const ext = vscode.extensions.getExtension("arno-dev.cpm-cmake-manager");
    if (ext) {
      await ext.activate();
      assert.ok(ext.isActive);
    }
  });

  test("Commands should be registered", () => {
    const expectedCommands = [
      "cpm-cmake-manager.clearCache",
      "cpm-cmake-manager.clearEntireCache",
      "cpm-cmake-manager.openPackage",
    ];

    return vscode.commands.getCommands(true).then((commands) => {
      for (const expectedCommand of expectedCommands) {
        assert.ok(
          commands.includes(expectedCommand),
          `Command '${expectedCommand}' should be registered`
        );
      }
    });
  });
});
