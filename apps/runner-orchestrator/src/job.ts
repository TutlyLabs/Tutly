import { claimRun, postResults } from "./callback.js";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { runTests } from "./runner.js";
import { assembleWorkspace, cleanupWorkspace } from "./sandbox.js";

export async function processJob(testRunId: string): Promise<void> {
  const log = logger.child({ testRunId, mode: env.RUNNER_MODE });
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

    log.info({ cwd }, "running tests");
    const outcome = await runTests(workspace);

    if (outcome.kind === "spawn-failed") {
      log.error({ error: outcome.error }, "runner spawn failed");
      await postResults({
        testRunId,
        status: "ERROR",
        errorMessage: `runner-spawn-failed: ${outcome.error}`,
      });
      return;
    }

    if (outcome.kind === "timeout") {
      log.warn("run timed out");
      await postResults({
        testRunId,
        status: "ERROR",
        errorMessage: "runner timeout",
      });
      return;
    }

    if (outcome.kind === "oom") {
      log.warn("run hit memory cap");
      await postResults({
        testRunId,
        status: "ERROR",
        errorMessage: "runner OOM",
      });
      return;
    }

    const { report } = outcome;
    log.info(
      {
        total: report.results.length,
        passed: report.results.filter((r) => r.passed).length,
        status: report.status,
      },
      "run complete",
    );

    await postResults({
      testRunId,
      status: report.status,
      results: report.results,
      jestReport: report.raw,
      errorMessage: report.errorMessage,
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
