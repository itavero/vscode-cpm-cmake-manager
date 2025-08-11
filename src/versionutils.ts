import * as semver from "semver";

export function tryRepairVersionNumber(version: string | undefined) {
  if (version === undefined) {
    return undefined;
  }
  version = version.trim();
  if (version.length === 0) {
    return undefined;
  }
  if (semver.valid(version)) {
    return version;
  }

  // Not a valid version yet, try to repair it.
  if (version.match(/^v?\d+$/)) {
    // If it's just a single number, add a minor version and patch version of 0.
    return `${version}.0.0`;
  } else if (version.match(/^v?\d+\.\d+$/)) {
    // If it's a major and minor version, add a patch version of 0.
    return `${version}.0`;
  } else {
    return undefined;
  }
}
