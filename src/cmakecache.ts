import * as vscode from "vscode";

// Function that reads the given CMakeCache.txt file line by line and returns all the
// variables in the file that are prefixed with CPM_ as a map.
export async function readCMakeCacheFile(
  cacheFile: vscode.Uri
): Promise<Map<string, string>> {
  const cmakeCache = new Map<string, string>();
  const fileContents = (
    await vscode.workspace.fs.readFile(cacheFile)
  ).toString();

  // Find all lines that match the following pattern.
  const regex = /^(CPM_[A-Za-z0-9_\-]+)(-ADVANCED)?:([^=]+)=(.*)$/gm;
  // This pattern matches all lines that are not comments and have the form:
  //   CPM_<name>:<type>=[value]
  // or
  //   CPM_<name>-ADVANCED:<type>=[value]
  // where <name> is a string of alphanumeric characters and underscores, <type> is a
  // string of any characters, and [value] is a string of any characters.
  for (const match of fileContents.matchAll(regex)) {
    const key = match[1];
    const value = match[4];
    cmakeCache.set(key, value);
  }

  return cmakeCache;
}

export class CpmCmakePackage {
  constructor(
    public name: string,
    public version: string | undefined,
    public sourceDir: string,
    public buildDir: string
  ) {}

  // Getter for the version of the package. If the version is not defined, return an empty string.
  public get versionString(): string | undefined {
    const ver = this.version?.trim() ?? "";
    if (ver.length > 0 && ver !== "0") {
      return `v${ver}`;
    }
    return undefined;
  }

  // Equals method for comparing two CpmCmakePackage objects.
  public equals(other: CpmCmakePackage): boolean {
    return (
      this.name === other.name &&
      this.version === other.version &&
      this.sourceDir === other.sourceDir &&
      this.buildDir === other.buildDir
    );
  }

  // toString method for printing a CpmCmakePackage object.
  public toString(): string {
    return `${this.name} ${this.versionString ?? ""}`.trim();
  }
}

// Get all CPM packages from the given CMake Cache and return them as a collection of
// CpmCmakePackage objects.
export function getCpmPackages(
  cmakeCache: Map<string, string>
): CpmCmakePackage[] {
  const cpmPackages: CpmCmakePackage[] = [];
  // All packages are listed in CPM_PACKAGES variable and separated by a semicolon (list separator in CMake).
  const packages: string[] = cmakeCache.get("CPM_PACKAGES")?.split(";") ?? [];
  for (const name of packages) {
    const version = cmakeCache.get(`CPM_PACKAGE_${name}_VERSION`);
    const sourceDir = cmakeCache.get(`CPM_PACKAGE_${name}_SOURCE_DIR`);
    const buildDir = cmakeCache.get(`CPM_PACKAGE_${name}_BINARY_DIR`);
    if (sourceDir && buildDir) {
      cpmPackages.push(new CpmCmakePackage(name, version, sourceDir, buildDir));
    }
  }
  return cpmPackages;
}
