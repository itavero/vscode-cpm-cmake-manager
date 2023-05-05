import { Disposable } from "vscode";

// Define inteface for logger
export interface Logger extends Disposable {
   error(message: string): void;
   warn(message: string): void;
   info(message: string): void;
}