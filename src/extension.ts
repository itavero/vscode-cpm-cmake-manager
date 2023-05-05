// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { PackagesView } from "./packagesview";
import { OutputChannelLogger } from "./outputlogger";
import { CmakeCacheWatcher } from "./cmakecachewatcher";
import { CpmManager } from "./cpmmanager";

let logger: OutputChannelLogger | undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Initialize objects
  if (logger === undefined) {
    logger = new OutputChannelLogger();
  }
  logger.info("Activating extension");
  const watcher = new CmakeCacheWatcher(logger);
  const manager = new CpmManager(logger);

  // Subscribe manager to events of watcher
  watcher.onDidChangeCmakeCache((uri) => manager.updateCmakeCache(uri));
  watcher.onDidStopWatchingCmakeCache((uri) => manager.removeCmakeCache(uri));

  // Create view
  const packagesView = new PackagesView(context, manager, logger);

  // When loading state of manager changes, show/hide the loading indicator on the PackagesView
  manager.onLoadingStateChange((loading) => {
    packagesView.setLoading(loading);
  });

  // Subscribe watcher to events of CMake Tools API
  watcher.connect();

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cpm-cmake-manager.clearCache",
      async () => {
        const packages = manager.cpmPackages;
        if (packages.length === 0) {
          vscode.window.showWarningMessage(
            "CPM Manager: No CPM packages detected to clear cache for."
          );
        } else {
          const items = packages.map((p) => p.name);
          vscode.window
            .showQuickPick(items, { canPickMany: true })
            .then((selected) => {
              if (selected) {
                selected.forEach((name) => {
                  if (manager.clearCacheForPackage(name)) {
                    vscode.window.showInformationMessage(
                      `CPM.cmake: ${name}: source and build directory cleared.`
                    );
                  } else {
                    vscode.window.showErrorMessage(
                      `CPM.cmake: Failed to clear cache for ${name}.`
                    );
                  }
                });
              }
            });
        }
      }
    ),
    vscode.commands.registerCommand(
      "cpm-cmake-manager.clearEntireCache",
      async () => {
        // Get cpm-cmake-manager.cachePath configuration property
        let cachePath = vscode.workspace
          .getConfiguration("cpm-cmake-manager")
          .get("cachePath") as string | null | undefined;
        // If cachePath is null, undefined or an empty string, get the value of the CPM_SOURCE_CACHE environment variable (if present).
        if (!cachePath || cachePath === "") {
          cachePath = process.env.CPM_SOURCE_CACHE;
        }

        // If cache path is still null, undefined or an empty string, show an error message and return.
        if (!cachePath || cachePath === "") {
          vscode.window.showErrorMessage(
            "CPM.cmake Manager: Failed to clear cache. No cache path specified or CPM_SOURCE_CACHE environment variable not set."
          );
          return;
        }

        // Check if cache path exists
        if (!vscode.workspace.fs.stat(vscode.Uri.file(cachePath))) {
          vscode.window.showErrorMessage(
            `CPM.cmake Manager: Failed to clear cache. Cache path does not exist (${cachePath}).`
          );
          return;
        }

        // Delete all files and folders in the cache path, but do not delete the cachePath folder itself.
        vscode.workspace.fs
          .delete(vscode.Uri.file(cachePath), {
            recursive: true,
            useTrash: false,
          })
          .then(async () => {
            vscode.window.showInformationMessage(
              `CPM.cmake Manager: Cache cleared (${cachePath}).`
            );

            // Trigger the CMake extension to delete the cache and reconfigure
            await vscode.commands.executeCommand("cmake.cleanConfigure");
          });
      }
    )
  );

  // Set cpm-cmake-manager.showTreeView to true to make the PackagesView visible on activation of the extension
  logger.info("Show tree view in Explorer tab");
  vscode.commands.executeCommand(
    "setContext",
    "cpm-cmake-manager.showTreeView",
    true
  );
}

// This method is called when your extension is deactivated
export function deactivate() {
  // Set cpm-cmake-manager.showTreeView to false to hide the PackagesView on deactivation of the extension
  logger?.info("Hide tree view in Explorer tab");
  vscode.commands.executeCommand(
    "setContext",
    "cpm-cmake-manager.showTreeView",
    false
  );
  logger?.dispose();
  logger = undefined;
}
