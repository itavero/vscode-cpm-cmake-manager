import { CpmCmakePackage } from "./cmakecache";
import * as fs from "fs";
import * as path from "path";
import { simpleGit, SimpleGit } from "simple-git";
import * as semver from "semver";
import { tryRepairVersionNumber } from "./versionutils";
import { Logger } from "./logger";

export class ScmPackage extends CpmCmakePackage {
  public get isGitClone(): boolean {
    return this.gitRemoteUrl !== undefined && this.gitRemoteUrl.length > 0;
  }

  public get hasNewerVersion(): boolean {
    if (this.latestVersionFromScm !== undefined) {
      const currentVersion = tryRepairVersionNumber(this.version);
      if (this.version === undefined || currentVersion === undefined) {
        return true;
      }
      return semver.gt(this.latestVersionFromScm, currentVersion);
    }
    return false;
  }

  private constructor(
    basePackage: CpmCmakePackage,
    public readonly gitRemoteUrl: string | undefined,
    public readonly latestVersionFromScm: string | undefined
  ) {
    super(
      basePackage.name,
      basePackage.version,
      basePackage.sourceDir,
      basePackage.buildDir
    );
  }

  static async initFromCpmPackage(pkg: CpmCmakePackage, logger?: Logger) {
    let gitRemoteUrl: string | undefined = undefined;
    let latestVersionFromScm: string | undefined = undefined;

    try {
      // Check if .git folder exists in the source directory.
      const gitDir = path.join(pkg.sourceDir, ".git");
      if (fs.existsSync(gitDir)) {
        // Get remote using Simple Git
        const git: SimpleGit = simpleGit(pkg.sourceDir);
        gitRemoteUrl = await git.getRemotes(true).then((remotes) => {
          const remote = remotes.find((r) => r.name === "origin");
          return remote?.refs.fetch;
        });

        if (gitRemoteUrl !== undefined) {
          // Use ls-remote to get the latest version from the remote.
          // If this operation fails, simply set the latestVersionFromScm to undefined.
          let versions = await git
            .listRemote(["--tags", gitRemoteUrl, "v*"])
            .then((tags) => {
              const result = new Set<string>();
              for (const tag of tags.split("\n")) {
                const parts = tag.split("\t");
                if (parts.length > 1) {
                  // Remove "refs/tags/v" from the beginning (if present)
                  // and "^{}" from the end (if present).
                  const version = tryRepairVersionNumber(
                    parts[1]
                      .replace(/^refs\/tags\/v/, "")
                      .replace(/\^\{\}$/, "")
                  );
                  if (version !== undefined) {
                    result.add(version);
                  }
                }
              }
              // Also check that SemVer thinks it's a valid version to prevent issues down the line.
              return Array.from(result);
            });
          if (versions.length > 0) {
            // Find the latest version using semver package
            latestVersionFromScm = versions.sort(semver.compare).reverse()[0];
          }
        }
      }
    } catch (e) {
      logger?.error(`Failed to get Git information for ${pkg.name}: ${e}`);
    }
    return new ScmPackage(pkg, gitRemoteUrl, latestVersionFromScm);
  }
}
