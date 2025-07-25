// Test file to validate CPM Language Model Tool functionality
import * as vscode from "vscode";
import { CpmLanguageModelTool } from "../cpmLanguageModelTool";
import { CpmManager } from "../cpmmanager";
import { OutputChannelLogger } from "../outputlogger";

// This is a simple test to ensure our Language Model Tool compiles and functions correctly
export async function testCpmLanguageModelTool() {
  const logger = new OutputChannelLogger();
  const manager = new CpmManager(logger);
  const tool = new CpmLanguageModelTool(manager, logger);

  // Test basic instantiation
  console.log("CPM Language Model Tool created successfully");

  // Test invoke method with mock options
  const mockOptions: vscode.LanguageModelToolInvocationOptions<void> = {
    input: undefined,
    toolInvocationToken: undefined,
  };

  try {
    const result = await tool.invoke(
      mockOptions,
      new vscode.CancellationTokenSource().token
    );
    console.log("Tool invocation completed successfully");
    console.log("Result type:", typeof result);
    return true;
  } catch (error) {
    console.error("Tool invocation failed:", error);
    return false;
  }
}
