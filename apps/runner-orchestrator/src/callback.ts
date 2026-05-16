import { env } from "./env.js";
import { logger } from "./logger.js";

type CallbackBody = {
  testRunId: string;
  status: "PASSED" | "FAILED" | "ERROR";
  results?: Array<{
    testCaseId?: string;
    title: string;
    visibility: "VISIBLE" | "HIDDEN";
    passed: boolean;
    points?: number;
    durationMs?: number;
    output?: string;
    error?: string;
    metadata?: unknown;
  }>;
  jestReport?: unknown;
  errorMessage?: string;
  logsArtifactId?: string;
  reportArtifactId?: string;
};

export async function postResults(body: CallbackBody): Promise<boolean> {
  const url = `${env.WEB_BASE_URL}/api/test-runner/callback`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Service-Token": env.TEST_RUNNER_SECRET,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.warn(
        { status: res.status, body: text, testRunId: body.testRunId },
        "callback non-2xx",
      );
    }
    return res.ok;
  } catch (err) {
    logger.error({ err, testRunId: body.testRunId }, "callback failed");
    return false;
  }
}

export type RunFetchResult = {
  claimed: boolean;
  run?: {
    id: string;
    submissionId: string;
    assignmentId: string;
    submission: {
      id: string;
      data: unknown;
      attachmentId: string;
    };
    assignment: {
      id: string;
      sandboxTemplate: string | null;
      hiddenTestFiles: Record<string, string> | null;
    };
  };
};

export async function claimRun(testRunId: string): Promise<RunFetchResult> {
  const url = `${env.WEB_BASE_URL}/api/test-runner/claim`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Token": env.TEST_RUNNER_SECRET,
    },
    body: JSON.stringify({ testRunId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`claim failed: ${res.status} ${text}`);
  }
  return (await res.json()) as RunFetchResult;
}
