# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project attempts to adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Fixed issue where version would not be correctly processed if they only had a major and minor version, e.g. `1.2` or `v1.2`.
- In case `CPM_USE_NAMED_CACHE_DIRECTORIES` is set, clearing the cache for a specific package, should now also remove the directory with the hash as name.

### Notes

- Lots of housekeeping (e.g. updating dependencies, adding an icon, etc.).
- From this release onwards, the release will also be published to GitHub (including the VSIX package).
