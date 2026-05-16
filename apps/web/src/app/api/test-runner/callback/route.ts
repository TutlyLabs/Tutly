import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { db } from "@tutly/db";
import { recordTestRunOutcome } from "@tutly/api/lib/test-run-scoring";

function checkSecret(req: NextRequest): boolean {
  const provided = req.headers.get("x-service-token") ?? "";
  const expected = process.env.TEST_RUNNER_SECRET ?? "";
  if (!expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

type CallbackBody = {
  testRunId?: string;
  status?: "PASSED" | "FAILED" | "ERROR";
  results?: Array<{
    testCaseId?: string;
    title: string;
    visibility?: "VISIBLE" | "HIDDEN";
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

export async function POST(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: CallbackBody;
  try {
    body = (await req.json()) as CallbackBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.testRunId || !body.status) {
    return NextResponse.json(
      { error: "testRunId and status required" },
      { status: 400 },
    );
  }

  const outcome = await recordTestRunOutcome(db, {
    testRunId: body.testRunId,
    status: body.status,
    results: body.results,
    jestReport: body.jestReport,
    errorMessage: body.errorMessage,
    logsArtifactId: body.logsArtifactId,
    reportArtifactId: body.reportArtifactId,
  });

  if (!outcome.ok) {
    return NextResponse.json({ error: "test run not found" }, { status: 404 });
  }

  return NextResponse.json(outcome);
}
