import * as vscode from "vscode";
import { CpmManager } from "./cpmmanager";
import { ScmPackage } from "./scmpackage";
import { Logger } from "./logger";

interface CpmPackageInfo {
  name: string;
  version?: string;
  sourceDir: string;
  buildDir: string;
  isGitClone?: boolean;
  gitRemoteUrl?: string;
  hasNewerVersion?: boolean;
  latestVersionFromScm?: string;
}

interface CpmProjectInfo {
  packages: CpmPackageInfo[];
  totalPackages: number;
  projectHasCpmPackages: boolean;
}

export class CpmLanguageModelTool implements vscode.LanguageModelTool<void> {
  constructor(
    private readonly cpmManager: CpmManager,
    private readonly logger: Logger
  ) {}

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<void>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      this.logger.info("CPM Language Model Tool invoked");

      // Get current CPM packages from the manager
      const packages = this.cpmManager.cpmPackages;

      // Convert to ScmPackage instances for additional Git information
      const packageInfoPromises = packages.map(async (pkg) => {
        try {
          const scmPackage = await ScmPackage.initFromCpmPackage(
            pkg,
            this.logger
          );
          const info: CpmPackageInfo = {
            name: scmPackage.name,
            version: scmPackage.version,
            sourceDir: scmPackage.sourceDir,
            buildDir: scmPackage.buildDir,
            isGitClone: scmPackage.isGitClone,
            gitRemoteUrl: scmPackage.gitRemoteUrl,
            hasNewerVersion: scmPackage.hasNewerVersion,
            latestVersionFromScm: scmPackage.latestVersionFromScm,
          };
          return info;
        } catch (error) {
          // Fallback to basic package info if SCM analysis fails
          const info: CpmPackageInfo = {
            name: pkg.name,
            version: pkg.version,
            sourceDir: pkg.sourceDir,
            buildDir: pkg.buildDir,
          };
          return info;
        }
      });

      const packageInfos = await Promise.all(packageInfoPromises);

      const result: CpmProjectInfo = {
        packages: packageInfos,
        totalPackages: packageInfos.length,
        projectHasCpmPackages: packageInfos.length > 0,
      };

      this.logger.info(
        `Returning information for ${result.totalPackages} CPM packages`
      );

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2)),
      ]);
    } catch (error) {
      this.logger.error(`Error in CPM Language Model Tool: ${error}`);

      const errorResult = {
        error: "Failed to retrieve CPM package information",
        details: error instanceof Error ? error.message : String(error),
        packages: [],
        totalPackages: 0,
        projectHasCpmPackages: false,
      };

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(JSON.stringify(errorResult, null, 2)),
      ]);
    }
  }
}

export function registerCpmLanguageModelTool(
  context: vscode.ExtensionContext,
  cpmManager: CpmManager,
  logger: Logger
): vscode.Disposable {
  const tool = new CpmLanguageModelTool(cpmManager, logger);

  const toolRegistration = vscode.lm.registerTool("cpm-cmake-packages", tool);

  context.subscriptions.push(toolRegistration);
  logger.info("CPM Language Model Tool registered");

  return toolRegistration;
}
