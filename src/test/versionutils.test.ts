import * as assert from "assert";
import { tryRepairVersionNumber } from "../versionutils";

suite("Version Utils Test Suite", () => {
  suite("tryRepairVersionNumber", () => {
    test("should return undefined for undefined input", () => {
      const result = tryRepairVersionNumber(undefined);
      assert.strictEqual(result, undefined);
    });

    test("should return undefined for empty string", () => {
      const result = tryRepairVersionNumber("");
      assert.strictEqual(result, undefined);
    });

    test("should return undefined for whitespace only", () => {
      const result = tryRepairVersionNumber("   ");
      assert.strictEqual(result, undefined);
    });

    test("should return valid semver unchanged", () => {
      const validVersions = [
        "1.0.0",
        "2.1.3",
        "1.0.0-alpha",
        "1.0.0-beta.1",
        "1.0.0+build.1",
      ];

      for (const version of validVersions) {
        const result = tryRepairVersionNumber(version);
        assert.strictEqual(result, version);
      }
    });

    test("should repair single number versions", () => {
      const testCases = [
        { input: "1", expected: "1.0.0" },
        { input: "v1", expected: "v1.0.0" },
        { input: "123", expected: "123.0.0" },
        { input: "v456", expected: "v456.0.0" },
      ];

      for (const testCase of testCases) {
        const result = tryRepairVersionNumber(testCase.input);
        assert.strictEqual(
          result,
          testCase.expected,
          `Failed for input "${testCase.input}"`
        );
      }
    });

    test("should repair major.minor versions", () => {
      const testCases = [
        { input: "1.2", expected: "1.2.0" },
        { input: "v1.2", expected: "v1.2.0" },
        { input: "12.34", expected: "12.34.0" },
        { input: "v56.78", expected: "v56.78.0" },
      ];

      for (const testCase of testCases) {
        const result = tryRepairVersionNumber(testCase.input);
        assert.strictEqual(
          result,
          testCase.expected,
          `Failed for input "${testCase.input}"`
        );
      }
    });

    test("should return undefined for invalid formats", () => {
      const invalidVersions = [
        "abc",
        "1.2.3.4",
        "v1.2.3.4",
        "1.2.a",
        "a.b.c",
        "1..2",
        ".1.2",
        "1.2.",
        "1.2.3-",
        "1.2.3+",
      ];

      for (const version of invalidVersions) {
        const result = tryRepairVersionNumber(version);
        assert.strictEqual(
          result,
          undefined,
          `Should return undefined for "${version}"`
        );
      }
    });

    test("should handle versions with whitespace", () => {
      const testCases = [
        { input: "  1.0.0  ", expected: "1.0.0" },
        { input: "\t2.1.3\n", expected: "2.1.3" },
        { input: " 1 ", expected: "1.0.0" },
        { input: " 1.2 ", expected: "1.2.0" },
      ];

      for (const testCase of testCases) {
        const result = tryRepairVersionNumber(testCase.input);
        assert.strictEqual(
          result,
          testCase.expected,
          `Failed for input "${testCase.input}"`
        );
      }
    });
  });
});
