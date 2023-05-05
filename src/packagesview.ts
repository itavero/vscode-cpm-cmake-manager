import * as vscode from "vscode";
import { CpmManager } from "./cpmmanager";
import { ScmPackage } from "./scmpackage";
import * as fs from "fs";
import { Logger } from "./logger";

export class PackagesView {
  public readonly view: vscode.TreeView<vscode.TreeItem>;

  constructor(
    private readonly context: vscode.ExtensionContext,
    manager: CpmManager,
    logger?: Logger
  ) {
    this.view = vscode.window.createTreeView("cpmPackages", {
      treeDataProvider: new PackageTreeDataProvider(manager, logger),
      showCollapseAll: true,
    });
    const openAction = vscode.commands.registerCommand(
      "cpm-cmake-manager.openPackage",
      (packageItem: PackageItem) => {
        // Check if source directory exists on disk
        if (fs.existsSync(packageItem.cpmPackage.sourceDir)) {
          // Open source directory in new window
          vscode.commands.executeCommand(
            "vscode.openFolder",
            vscode.Uri.file(packageItem.cpmPackage.sourceDir),
            true
          );
        } else {
          vscode.window.showErrorMessage(
            `CPM.cmake: Source directory for ${packageItem.cpmPackage.name} does not exist.`
          );
        }
      }
    );
    context.subscriptions.push(this.view, openAction);
  }

  setLoading(loading: boolean) {
    // TODO: Implement loading indicator
  }
}

class PackageTreeDataProvider implements vscode.TreeDataProvider<PackageItem> {
  // Event: onDidChangeTreeData
  private readonly _onDidChangeTreeData: vscode.EventEmitter<
    PackageItem | undefined
  > = new vscode.EventEmitter<PackageItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<PackageItem | undefined> =
    this._onDidChangeTreeData.event;

  private items: PackageItem[] = [];

  constructor(
    private readonly manager: CpmManager,
    private readonly logger?: Logger
  ) {
    // No need to update the packages right away, as we always expect the CPM packages to be updated after the extension is loaded.
    manager.onDidChangeCpmPackages(async () => {
      await this.updatePackages();
    });
  }

  private async updatePackages(): Promise<void> {
    this.items = (
      await Promise.all(
        this.manager.cpmPackages.map((p) =>
          ScmPackage.initFromCpmPackage(p, this.logger)
        )
      )
    ).map((p) => new PackageItem(p));
    this._onDidChangeTreeData.fire(undefined);
  }

  getChildren(
    element?: vscode.TreeItem | undefined
  ): vscode.ProviderResult<PackageItem[]> {
    return this.items;
  }

  getTreeItem(element: PackageItem): vscode.TreeItem {
    return element;
  }
}

class PackageItem extends vscode.TreeItem {
  constructor(public cpmPackage: ScmPackage) {
    super(cpmPackage.name);
    this.id = cpmPackage.toString();
    this.description = cpmPackage.versionString ?? "unknown";
    this.iconPath = new vscode.ThemeIcon("bracket");
    if (cpmPackage.hasNewerVersion) {
      this.description += ` (v${cpmPackage.latestVersionFromScm} available)`;
      this.tooltip = `${cpmPackage.name} v${cpmPackage.latestVersionFromScm} is available`;
      this.iconPath = new vscode.ThemeIcon("bracket-dot");
    }
  }
}
