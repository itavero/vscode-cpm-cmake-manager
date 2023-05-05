import { Logger } from "./logger";
import * as vscode from "vscode";

export class OutputChannelLogger implements Logger {
  protected channel: vscode.OutputChannel | undefined;

  protected appendLine(line: string) {
    // Always log to console as well (with a prefix and the current time in 24h format)
    console.log(
      `[CPM.cmake Manager][${new Date().toLocaleTimeString("en-US", {
        hour12: false,
      })}] ${line}`
    );
    if (!this.channel) {
      this.channel = vscode.window.createOutputChannel("CPM.cmake Manager");
    }
    this.channel.appendLine(line);
  }

  error(message: string): void {
    this.appendLine(`🚩 ${message}`);
  }
  warn(message: string): void {
    this.appendLine(`⚠️ ${message}`);
  }
  info(message: string): void {
    this.appendLine(message);
  }

  dispose() {
    if (this.channel) {
      this.channel.dispose();
      this.channel = undefined;
    }
  }
}
