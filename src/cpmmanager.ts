import {
  CpmCmakePackage,
  getCpmPackages,
  readCMakeCacheFile,
} from "./cmakecache";
import { Logger } from "./logger";
import * as vscode from "vscode";
import * as fs from "fs";

// Management class that keeps track of the CMakeCache files that are watched by
// a CmakeCacheWatcher class and retrieves the CPM packages from them when they
// are changed.
export class CpmManager {
  private readonly _cmakeCaches: Map<string, CpmCmakePackage[]> = new Map();

  // Event that is fired when the list of CPM packages has been updated
  private readonly _onDidChangeCpmPackages: vscode.EventEmitter<void> =
    new vscode.EventEmitter<void>();
  public readonly onDidChangeCpmPackages: vscode.Event<void> =
    this._onDidChangeCpmPackages.event;

  // Event that is fired when the list of CPM packages has started or stopped loading
  private readonly _onLoadingStateChange: vscode.EventEmitter<boolean> =
    new vscode.EventEmitter<boolean>();
  public readonly onLoadingStateChange: vscode.Event<boolean> =
    this._onLoadingStateChange.event;

  constructor(private readonly logger: Logger) {}

  // Getter that returns a single list of all CPM packages from all CMakeCache files,
  // sorted by name and with equal packages removed.
  get cpmPackages(): CpmCmakePackage[] {
    const packages: CpmCmakePackage[] = [];
    this._cmakeCaches.forEach((value) => {
      packages.push(...value);
    });
    return packages
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((value, index, self) => {
        return self.findIndex((v) => v.name === value.name) === index;
      });
  }

  clearCacheForPackage(name: string): boolean {
    // Iterate over all packages to find matches and remove source directory and build directory
    let found: boolean = false;
    this._cmakeCaches.forEach((value, key) => {
      const pkg = value.find((v) => v.name === name);
      if (pkg) {
        found = true;
        this.logger.info(
          `Removing sources for ${pkg.name} in ${pkg.sourceDir}`
        );
        // Check if sourceDir exists and remove
        if (fs.existsSync(pkg.sourceDir)) {
          fs.rmdirSync(pkg.sourceDir, { recursive: true });
        }
        this.logger.info(
          `Removing build directory for ${pkg.name} in ${pkg.buildDir}`
        );
        // Check if buildDir exists and remove
        if (fs.existsSync(pkg.buildDir)) {
          fs.rmdirSync(pkg.buildDir, { recursive: true });
        }
      }
    });
    if (!found) {
      this.logger.info(`Package ${name} not found. Cache not cleared.S`);
    }
    return found;
  }

  async updateCmakeCache(uri: vscode.Uri): Promise<void> {
    // Fire "loading" event
    this._onLoadingStateChange.fire(true);

    this.logger.info(`CMakeCache.txt file changed: ${uri.fsPath}`);
    // Read CMakeCache and get CPM packages
    const cpmPackages = getCpmPackages(await readCMakeCacheFile(uri));

    // If we already knew about this cache, check if the packages have changed
    const oldPackages = this._cmakeCaches.get(uri.fsPath);
    if (!oldPackages || !this.compareCpmPackages(oldPackages, cpmPackages)) {
      // Packages have changed or this is a new cache, update the cache and fire event.
      this._cmakeCaches.set(uri.fsPath, cpmPackages);
      this._onDidChangeCpmPackages.fire();
    }

    // Fire "not loading" event
    this._onLoadingStateChange.fire(false);
  }

  async removeCmakeCache(uri: vscode.Uri): Promise<void> {
    // Fire "loading" event
    this._onLoadingStateChange.fire(true);

    this.logger.info(`CMakeCache.txt file no longer watched: ${uri.fsPath}`);
    // Check if file was in cache and if it defined any CPM packages
    const oldPackages = this._cmakeCaches.get(uri.fsPath);
    if (oldPackages && oldPackages.length > 0) {
      // Remove the cache and fire event
      this._cmakeCaches.delete(uri.fsPath);
      this._onDidChangeCpmPackages.fire();
    }

    // Fire "not loading" event
    this._onLoadingStateChange.fire(false);
  }

  private compareCpmPackages(
    oldPackages: CpmCmakePackage[],
    newPackages: CpmCmakePackage[]
  ) {
    // If the number of packages is different, they are not the same
    if (oldPackages.length !== newPackages.length) {
      return false;
    }

    // Iterate over old packages and see if there is an equal entry in the new packages
    for (const oldPackage of oldPackages) {
      const newPackage = newPackages.find((p) => p.equals(oldPackage));
      if (!newPackage) {
        return false;
      }
    }
    return true;
  }
}
