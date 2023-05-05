import * as vscode from "vscode";
import { CMakeToolsApi, Version, getCMakeToolsApi } from "vscode-cmake-tools";
import { Logger } from "./logger";

// Class that watches for changes to CMakeCache.txt files in the build directories of
// all projects in the workspace.
export class CmakeCacheWatcher {
  // Event for when a CMakeCache.txt file is changed
  private _onDidChangeCmakeCache: vscode.EventEmitter<vscode.Uri> =
    new vscode.EventEmitter<vscode.Uri>();
  public readonly onDidChangeCmakeCache: vscode.Event<vscode.Uri> =
    this._onDidChangeCmakeCache.event;
  // Event for when a CMakeCache.txt file is no longer being watched
  private _onDidStopWatchingCmakeCache: vscode.EventEmitter<vscode.Uri> =
    new vscode.EventEmitter<vscode.Uri>();
  public readonly onDidStopWatchingCmakeCache: vscode.Event<vscode.Uri> =
    this._onDidStopWatchingCmakeCache.event;

  private _cmakeToolsApi: CMakeToolsApi | undefined;
  // Map with build directory as key and watcher as value
  private _fileWatchers: Map<string, vscode.FileSystemWatcher> = new Map();
  // Keep track of known CMake projects by their project directory
  private _knownProjects: Set<string> = new Set();

  constructor(private readonly logger: Logger) {}

  async updateProjects() {
    this.logger.info("Updating projects");
    const buildDirs: Set<string> = new Set();
    const projectDirs: Set<string> = new Set();
    if (this._cmakeToolsApi) {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) {
        this.logger.error("No workspace is open");
      } else {
        for (var folder of folders) {
          const proj = await this._cmakeToolsApi.getProject(folder.uri);
          if (!proj) {
            this.logger.warn(`No CMake project found in ${folder.name}`);
            continue;
          }

          projectDirs.add(folder.uri.fsPath);
          if (!this._knownProjects.has(folder.uri.fsPath)) {
            this._knownProjects.add(folder.uri.fsPath);
            proj.onCodeModelChanged(async () => {
              this.logger.info(
                `Code model changed for CMake project in ${folder.name}`
              );
              await this.updateProjects();
            });
          }

          let dir = await proj.getBuildDirectory();
          if (dir) {
            buildDirs.add(dir);
          } else {
            this.logger.warn(
              `No build directory found for CMake project in ${folder.name}`
            );
          }
        }
      }
    } else {
      this.logger.error(
        "CMake Tools API not available. Extension unable to function."
      );
    }

    // Create new watchers
    for (const buildDir of buildDirs) {
      let watcher = this._fileWatchers.get(buildDir);
      if (!watcher) {
        const uri: vscode.Uri = vscode.Uri.joinPath(
          vscode.Uri.file(buildDir),
          "CMakeCache.txt"
        );
        this.logger.info(`Start watching: ${uri.fsPath}`);
        watcher = vscode.workspace.createFileSystemWatcher(
          uri.fsPath,
          false,
          false,
          true
        );
        watcher.onDidChange((uri) => this.onCmakeCacheChanged(uri));
        watcher.onDidCreate((uri) => this.onCmakeCacheChanged(uri));
        this._fileWatchers.set(buildDir, watcher);
        this.onCmakeCacheChanged(uri);
      }
    }

    // Clean up unused watchers
    for (var [buildDir, watcher] of this._fileWatchers) {
      if (!buildDirs.has(buildDir)) {
        const uri: vscode.Uri = vscode.Uri.joinPath(
          vscode.Uri.file(buildDir),
          "CMakeCache.txt"
        );
        this.logger.info(`Stop watching: ${uri.fsPath}`);
        watcher.dispose();
        this._fileWatchers.delete(buildDir);
        this._onDidStopWatchingCmakeCache.fire(uri);
      }
    }

    // Clean up known projects
    for (const projectDir of this._knownProjects) {
      if (!projectDirs.has(projectDir)) {
        this._knownProjects.delete(projectDir);
      }
    }
  }

  async connect(): Promise<void> {
    this._cmakeToolsApi = await getCMakeToolsApi(Version.v1);
    if (!this._cmakeToolsApi) {
      this.logger.error(
        "CMake Tools API not available. Extension unable to function."
      );
      return;
    }
    vscode.workspace.onDidChangeWorkspaceFolders(async (e) => {
      await this.updateProjects();
    });

    this._cmakeToolsApi.onActiveProjectChanged(async (e) => {
      await this.updateProjects();
    });

    // Immediately run updateProjects as well
    await this.updateProjects();
  }

  dispose() {
    for (var [buildDir, watcher] of this._fileWatchers) {
      watcher.dispose();
    }
    this._fileWatchers.clear();
    this.logger.dispose();
  }

  private onCmakeCacheChanged(uri: vscode.Uri) {
    this._onDidChangeCmakeCache.fire(uri);
  }
}
