// Shape both runners normalize to, so job.ts stays mode-agnostic.

export type MappedTest = {
  testCaseId?: string;
  title: string;
  visibility: "VISIBLE" | "HIDDEN";
  passed: boolean;
  durationMs?: number;
  error?: string;
};

export type MappedReport = {
  status: "PASSED" | "FAILED" | "ERROR";
  results: MappedTest[];
  errorMessage?: string;
  raw: unknown;
};

export type RunOutcome =
  | { kind: "completed"; report: MappedReport; stderrTail: string }
  | { kind: "timeout"; stderrTail: string }
  | { kind: "oom"; stderrTail: string }
  | { kind: "spawn-failed"; error: string };

const HIDDEN_PREFIX = "__hidden__";

// Whole-segment match: a student file named `my__hidden__.test.ts` stays visible.
export function visibilityFor(filePath: string): "VISIBLE" | "HIDDEN" {
  return filePath.split("/").some((seg) => seg === HIDDEN_PREFIX)
    ? "HIDDEN"
    : "VISIBLE";
}

// No test files at all is a pass, not an error.
export function emptyPassReport(): MappedReport {
  return {
    status: "PASSED",
    results: [],
    raw: { noTests: true },
  };
}
