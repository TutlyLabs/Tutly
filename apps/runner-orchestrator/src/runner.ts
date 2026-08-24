import type { RunOutcome } from "./report.js";
import type { AssembledWorkspace } from "./sandbox.js";
import { runBrowser } from "./browser-runner.js";
import { env } from "./env.js";
import { runJest } from "./jest-runner.js";
import { emptyPassReport } from "./report.js";

export async function runTests(
  workspace: AssembledWorkspace,
): Promise<RunOutcome> {
  if (!workspace.hasTestFiles) {
    return { kind: "completed", report: emptyPassReport(), stderrTail: "" };
  }

  return env.RUNNER_MODE === "browser"
    ? runBrowser(workspace.cwd)
    : runJest(workspace.cwd);
}
