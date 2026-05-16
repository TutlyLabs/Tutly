import { claimRun, postResults } from "./callback.js";
import { runJest } from "./jest-runner.js";
import { logger } from "./logger.js";
import { assembleWorkspace, cleanupWorkspace } from "./sandbox.js";

const HIDDEN_PREFIX = "__hidden__/";

export async function processJob(testRunId: string): Promise<void> {
  const log = logger.child({ testRunId });
  let cwd: string | undefined;

  try {
    const claim = await claimRun(testRunId);
    if (!claim.claimed || !claim.run) {
      log.info("claim skipped (run not in QUEUED state)");
      return;
    }
    const { run } = claim;

    log.info("claimed; assembling workspace");
    const workspace = await assembleWorkspace({
      testRunId,
      submissionData: run.submission.data,
      sandboxTemplate: run.assignment.sandboxTemplate,
      hiddenTestFiles: run.assignment.hiddenTestFiles,
    });
    cwd = workspace.cwd;

    log.info({ cwd }, "running jest");
    const outcome = await runJest(cwd);

    if (outcome.kind === "spawn-failed") {
      log.error({ error: outcome.error }, "jest spawn failed");
      await postResults({
        testRunId,
        status: "ERROR",
        errorMessage: `runner-spawn-failed: ${outcome.error}`,
      });
      return;
    }

    if (outcome.kind === "timeout") {
      log.warn("jest run timed out");
      await postResults({
        testRunId,
        status: "ERROR",
        errorMessage: "runner timeout",
      });
      return;
    }

    if (outcome.kind === "oom") {
      log.warn({ vmRss: outcome.vmRss }, "jest run hit memory cap");
      await postResults({
        testRunId,
        status: "ERROR",
        errorMessage: `runner OOM (rss=${outcome.vmRss ?? "unknown"}kb)`,
      });
      return;
    }

    if (!outcome.report) {
      log.warn(
        { exitCode: outcome.exitCode, stderr: outcome.stderrTail },
        "no jest report",
      );
      await postResults({
        testRunId,
        status: "ERROR",
        errorMessage:
          outcome.stderrTail.slice(-1000) ||
          `jest exited with code ${outcome.exitCode ?? "?"} but no report`,
      });
      return;
    }

    const results = outcome.report.testResults.map((t) => {
      const visibility: "VISIBLE" | "HIDDEN" = t.filePath.includes(
        HIDDEN_PREFIX,
      )
        ? "HIDDEN"
        : "VISIBLE";
      return {
        title: t.fullName || t.title,
        visibility,
        passed: t.passed,
        durationMs: Math.round(t.durationMs),
        error: t.error,
      };
    });

    const allPassed = results.length > 0 && results.every((r) => r.passed);
    const status = allPassed ? "PASSED" : "FAILED";

    log.info(
      {
        total: results.length,
        passed: results.filter((r) => r.passed).length,
        status,
      },
      "jest run complete",
    );

    await postResults({
      testRunId,
      status,
      results,
      jestReport: outcome.report.raw,
    });
  } catch (err) {
    log.error({ err }, "job failed unexpectedly");
    await postResults({
      testRunId,
      status: "ERROR",
      errorMessage: err instanceof Error ? err.message : String(err),
    }).catch(() => undefined);
  } finally {
    if (cwd) {
      await cleanupWorkspace(cwd);
    }
  }
}
