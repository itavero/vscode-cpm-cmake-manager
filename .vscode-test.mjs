import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "out/test/**/*.test.js",
  workspaceFolder: "./example",
  extensionDevelopmentPath: ".",
  extensionTestsPath: "./out/test",
  version: "stable",
  installExtensions: ["ms-vscode.cmake-tools"],
});
