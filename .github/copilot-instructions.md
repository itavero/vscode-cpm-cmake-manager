# Copilot instructions

This project provides a simple user interface that shows which packages/dependencies have been pulled in via CPM.cmake (a package manager for CMake, written in CMake).
It also provides shortcuts for opening the cached source directories of these packages, and cleaning the cache.

We use a CMake test project for running the tests, which is located in the `example` directory.

The extension itself is written in TypeScript and we use npm scripts to build and test the extension:

- Build: `npm run compile`
- Lint: `npm run lint`
- Test: `npm run test`

Note: as can be seen in the `package.json`, as a pre-test step both building and linting are run.
This means you can run `npm test` to build, lint and run the tests in one go.

When running tests in a headless environment (such as in CI or when not running in Agent mode in VS Code), you can use `xvfb` to provide a virtual display. If xvfb is available, you can run tests using:
`xvfb-run --auto-servernum npm test`
