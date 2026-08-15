import type { MappedReport, MappedTest } from "./report.js";
import { visibilityFor } from "./report.js";

type SandpackTest = {
  name: string;
  blocks?: string[];
  status: "pass" | "fail" | "idle" | "running";
  path?: string;
  errors?: Array<{
    message?: string;
    name?: string;
    matcherResult?: unknown;
    mappedErrors?: Array<{ fileName?: string; _originalScriptCode?: unknown }>;
  }>;
  duration?: number;
};

type SandpackFileError = {
  path: string;
  error: {
    message?: string;
    name?: string;
  };
};

export type DriverOutcome = {
  ok: boolean;
  testsByPath?: Record<string, SandpackTest[]>;
  fileErrors?: SandpackFileError[];
  timedOut?: boolean;
  bootError?: string;
  error?: string;
  noTestsInManifest?: boolean;
  consoleLog?: string[];
  pageErrors?: string[];
};

function formatTitle(
  path: string,
  blocks: string[] | undefined,
  name: string,
): string {
  const trail = [...(blocks ?? []), name].filter(Boolean).join(" > ");
  return `${path} > ${trail}`;
}

function formatError(test: SandpackTest): string | undefined {
  if (!test.errors || test.errors.length === 0) return undefined;
  return test.errors
    .map((e) => e.message ?? e.name ?? "test failed")
    .join("\n\n");
}

export function mapDriverOutcome(outcome: DriverOutcome): MappedReport {
  if (!outcome.ok) {
    return {
      status: "ERROR",
      results: [],
      errorMessage:
        outcome.error ??
        outcome.bootError ??
        (outcome.pageErrors?.[0]
          ? `page error: ${outcome.pageErrors[0]}`
          : "browser runner crashed"),
      raw: outcome,
    };
  }

  if (outcome.bootError) {
    return {
      status: "ERROR",
      results: [],
      errorMessage: `sandbox boot failed: ${outcome.bootError}`,
      raw: outcome,
    };
  }

  if (outcome.timedOut) {
    return {
      status: "ERROR",
      results: [],
      errorMessage: "test run did not complete within in-page timeout",
      raw: outcome,
    };
  }

  const results: MappedTest[] = [];
  for (const [path, tests] of Object.entries(outcome.testsByPath ?? {})) {
    for (const t of tests) {
      results.push({
        title: formatTitle(path, t.blocks, t.name),
        visibility: visibilityFor(path),
        passed: t.status === "pass",
        durationMs:
          typeof t.duration === "number" ? Math.round(t.duration) : undefined,
        error: t.status === "pass" ? undefined : formatError(t),
      });
    }
  }

  for (const fe of outcome.fileErrors ?? []) {
    results.push({
      title: `${fe.path} > <compile error>`,
      visibility: visibilityFor(fe.path),
      passed: false,
      error: fe.error.message ?? fe.error.name ?? "file failed to compile",
    });
  }

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;

  if (total === 0) {
    if (outcome.noTestsInManifest) {
      return {
        status: "PASSED",
        results: [],
        errorMessage: undefined,
        raw: outcome,
      };
    }
    return {
      status: "ERROR",
      results: [],
      errorMessage: "no tests reported by the bundler",
      raw: outcome,
    };
  }

  return {
    status: passed === total ? "PASSED" : "FAILED",
    results,
    errorMessage: undefined,
    raw: outcome,
  };
}
