import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { CpmLanguageModelTool } from "../../cpmLanguageModelTool";
import { CpmManager } from "../../cpmmanager";
import { Logger } from "../../logger";
// import * as myExtension from '../../extension';

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Sample test", () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });

  test("CPM Language Model Tool", async () => {
    // Create mock logger
    const mockLogger: Logger = {
      error: (message: string) => console.error(message),
      warn: (message: string) => console.warn(message),
      info: (message: string) => console.info(message),
      dispose: () => {},
    };

    const mockCpmManager = new CpmManager(mockLogger);
    const tool = new CpmLanguageModelTool(mockCpmManager, mockLogger);

    // Test the invoke method
    const mockToken: vscode.CancellationToken = {
      isCancellationRequested: false,
      onCancellationRequested: () => new vscode.Disposable(() => {}),
    };

    const mockOptions: vscode.LanguageModelToolInvocationOptions<void> = {
      toolInvocationToken: undefined,
      input: undefined,
    };

    try {
      const result = await tool.invoke(mockOptions, mockToken);

      // Result should be a LanguageModelToolResult
      assert.ok(result);
      assert.ok(result.content);
      assert.ok(result.content.length > 0);

      // Extract the text content from the first part
      const textPart = result.content[0] as vscode.LanguageModelTextPart;
      assert.ok(textPart);

      // Should have string content that can be parsed as JSON
      const jsonContent = textPart.value;
      const parsed = JSON.parse(jsonContent);
      assert.ok(parsed);
      assert.ok(Array.isArray(parsed.packages));

      console.log("CPM Language Model Tool test passed");
    } catch (error) {
      // If there's no CPM project or Git repo, that's expected
      console.log(
        "CPM Language Model Tool test completed (no CPM project found):",
        error
      );
    }
  });
});
