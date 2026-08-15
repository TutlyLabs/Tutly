import type { MappedReport, MappedTest } from "./report.js";
import { visibilityFor } from "./report.js";

type JestAssertion = {
  ancestorTitles?: string[];
  title?: string;
  fullName?: string;
  status?: string;
  duration?: number | null;
  failureMessages?: string[];
};

type JestTestFile = {
  testFilePath?: string;
  name?: string;
  numFailingTests?: number;
  numPassingTests?: number;
  numPendingTests?: number;
  status?: string;
  assertionResults?: JestAssertion[];
  message?: string;
};

export type JestJsonReport = {
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  testResults?: JestTestFile[];
};

export function mapJestReport(parsed: JestJsonReport): MappedReport {
  const results: MappedTest[] = [];

  for (const file of parsed.testResults ?? []) {
    const filePath = file.testFilePath ?? file.name ?? "";
    const visibility = visibilityFor(filePath);

    // A suite that failed to compile has no assertions — surface it as one
    // failing entry instead of silently reporting zero tests for the file.
    if ((file.assertionResults ?? []).length === 0 && file.message) {
      results.push({
        title: `${filePath} > <compile error>`,
        visibility,
        passed: false,
        error: file.message,
      });
      continue;
    }

    for (const assertion of file.assertionResults ?? []) {
      const trail = [...(assertion.ancestorTitles ?? []), assertion.title ?? ""]
        .filter(Boolean)
        .join(" > ");
      results.push({
        title: trail || assertion.fullName || assertion.title || "(unnamed)",
        visibility,
        passed: assertion.status === "passed",
        durationMs: Math.round(assertion.duration ?? 0),
        error:
          assertion.status === "passed"
            ? undefined
            : assertion.failureMessages?.join("\n"),
      });
    }
  }

  if (results.length === 0) {
    return {
      status: "ERROR",
      results: [],
      errorMessage: "no tests reported by jest",
      raw: parsed,
    };
  }

  const passed = results.filter((r) => r.passed).length;
  return {
    status: passed === results.length ? "PASSED" : "FAILED",
    results,
    raw: parsed,
  };
}
