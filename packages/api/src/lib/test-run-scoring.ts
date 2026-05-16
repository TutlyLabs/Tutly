import type { Db } from "@tutly/db";

export const DEFAULT_TEST_MAX_SCORE = 10;

export const reportedTestVisibility = ["VISIBLE", "HIDDEN"] as const;

export type ReportedTest = {
  testCaseId?: string;
  title: string;
  visibility?: (typeof reportedTestVisibility)[number];
  passed: boolean;
  points?: number;
  durationMs?: number;
  output?: string;
  error?: string;
  metadata?: unknown;
};

export function scoreReportedResults(
  results: ReportedTest[],
  cases: Array<{ id: string; points: number }>,
) {
  const pointsByCase = new Map(
    cases.map((testCase) => [testCase.id, testCase.points]),
  );
  const lacksCaseMapping =
    results.length > 0 &&
    results.every(
      (result) =>
        result.testCaseId === undefined && result.points === undefined,
    );

  if (cases.length === 1 && lacksCaseMapping) {
    const casePoints = cases[0]?.points ?? 1;
    const perResultPoints = casePoints / results.length;
    const normalized = results.map((result) => ({
      ...result,
      visibility: result.visibility ?? "VISIBLE",
      points: perResultPoints,
    }));
    const scoreRaw = normalized.reduce(
      (total, result) => total + (result.passed ? result.points : 0),
      0,
    );
    return {
      normalized,
      score: Math.round(scoreRaw),
      maxScore: Math.round(casePoints),
      passed: normalized.filter((r) => r.passed).length,
      total: normalized.length,
    };
  }

  // No explicit cases → normalise to DEFAULT_TEST_MAX_SCORE.
  if (cases.length === 0) {
    const totalResults = results.length;
    const perResultPoints =
      totalResults > 0 ? DEFAULT_TEST_MAX_SCORE / totalResults : 0;
    const normalized = results.map((result) => ({
      ...result,
      visibility: result.visibility ?? "VISIBLE",
      points: perResultPoints,
    }));
    const scoreRaw = normalized.reduce(
      (total, result) => total + (result.passed ? result.points : 0),
      0,
    );
    const passedCount = normalized.filter((r) => r.passed).length;
    return {
      normalized,
      score: totalResults > 0 ? Math.round(scoreRaw) : 0,
      maxScore: totalResults > 0 ? DEFAULT_TEST_MAX_SCORE : 0,
      passed: passedCount,
      total: totalResults,
    };
  }

  const normalized = results.map((result) => {
    const points =
      result.points ??
      (result.testCaseId ? pointsByCase.get(result.testCaseId) : undefined) ??
      1;
    return { ...result, visibility: result.visibility ?? "VISIBLE", points };
  });

  const scoreRaw = normalized.reduce(
    (total, result) => total + (result.passed ? result.points : 0),
    0,
  );
  const maxScoreRaw = cases.reduce(
    (total, testCase) => total + testCase.points,
    0,
  );

  return {
    normalized,
    score: Math.round(scoreRaw),
    maxScore: Math.round(maxScoreRaw),
    passed: normalized.filter((r) => r.passed).length,
    total: cases.length,
  };
}

export type RecordOutcomeInput = {
  testRunId: string;
  status: "PASSED" | "FAILED" | "ERROR";
  results?: ReportedTest[];
  jestReport?: unknown;
  errorMessage?: string;
  logsArtifactId?: string;
  reportArtifactId?: string;
};

export type RecordOutcomeResult =
  | { ok: false; reason: "not-found" }
  | { ok: true; idempotent: true; runId: string }
  | {
      ok: true;
      idempotent: false;
      runId: string;
      score: number;
      maxScore: number;
    };

export async function recordTestRunOutcome(
  db: Db,
  input: RecordOutcomeInput,
): Promise<RecordOutcomeResult> {
  const run = await db.submissionTestRun.findUnique({
    where: { id: input.testRunId },
  });
  if (!run) return { ok: false, reason: "not-found" };
  if (run.status !== "QUEUED" && run.status !== "RUNNING") {
    return { ok: true, idempotent: true, runId: run.id };
  }

  if (input.status === "ERROR") {
    await db.submissionTestRun.update({
      where: { id: run.id },
      data: {
        status: "ERROR",
        errorMessage: input.errorMessage ?? "runner error",
        jestReport: (input.jestReport ?? null) as never,
        outputSummary: { results: [], source: "runner-error" } as never,
        logsArtifactId: input.logsArtifactId ?? run.logsArtifactId,
        reportArtifactId: input.reportArtifactId ?? run.reportArtifactId,
        completedAt: new Date(),
      },
    });
    return {
      ok: true,
      idempotent: false,
      runId: run.id,
      score: 0,
      maxScore: 0,
    };
  }

  const cases = await db.assignmentTestCase.findMany({
    where: { assignmentId: run.assignmentId },
    select: { id: true, points: true, visibility: true },
  });
  const score = scoreReportedResults(input.results ?? [], cases);
  const visibleResults = score.normalized.filter(
    (r) => r.visibility !== "HIDDEN",
  );
  const hiddenResults = score.normalized.filter(
    (r) => r.visibility === "HIDDEN",
  );
  const completedAt = new Date();

  await db.submissionTestRun.update({
    where: { id: run.id },
    data: {
      status: input.status,
      visiblePassed: visibleResults.filter((r) => r.passed).length,
      visibleTotal: visibleResults.length,
      hiddenPassed: hiddenResults.filter((r) => r.passed).length,
      hiddenTotal: hiddenResults.length,
      score: score.score,
      maxScore: score.maxScore,
      jestReport: (input.jestReport ?? null) as never,
      errorMessage: null,
      outputSummary: {
        results: score.normalized,
        source: "runner-orchestrator",
      } as never,
      logsArtifactId: input.logsArtifactId ?? run.logsArtifactId,
      reportArtifactId: input.reportArtifactId ?? run.reportArtifactId,
      startedAt: run.startedAt ?? completedAt,
      completedAt,
    },
  });

  await db.point.upsert({
    where: {
      submissionId_category: {
        submissionId: run.submissionId,
        category: "TESTS",
      },
    },
    create: {
      submissionId: run.submissionId,
      category: "TESTS",
      score: score.score,
      maxScore: score.maxScore,
      source: "runner-orchestrator",
      testRunId: run.id,
      feedback:
        input.status === "PASSED" ? "All tests passed." : "Some tests failed.",
      metadata: { trigger: run.trigger } as never,
    },
    update: {
      score: score.score,
      maxScore: score.maxScore,
      source: "runner-orchestrator",
      testRunId: run.id,
      feedback:
        input.status === "PASSED" ? "All tests passed." : "Some tests failed.",
      metadata: { trigger: run.trigger } as never,
    },
  });

  await db.submissionReview.upsert({
    where: { submissionId: run.submissionId },
    create: {
      submissionId: run.submissionId,
      assignmentId: run.assignmentId,
      status: input.status === "PASSED" ? "AUTO_SCORED" : "NEEDS_REVIEW",
      autoScore: score.score,
      maxScore: score.maxScore,
      testRunId: run.id,
    },
    update: {
      status: input.status === "PASSED" ? "AUTO_SCORED" : "NEEDS_REVIEW",
      autoScore: score.score,
      maxScore: score.maxScore,
      testRunId: run.id,
    },
  });

  return {
    ok: true,
    idempotent: false,
    runId: run.id,
    score: score.score,
    maxScore: score.maxScore,
  };
}
