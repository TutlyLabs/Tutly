import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { db } from "@tutly/db";

function checkSecret(req: NextRequest): boolean {
  const provided = req.headers.get("x-service-token") ?? "";
  const expected = process.env.TEST_RUNNER_SECRET ?? "";
  if (!expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { testRunId?: unknown };
  try {
    body = (await req.json()) as { testRunId?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (typeof body.testRunId !== "string") {
    return NextResponse.json({ error: "testRunId required" }, { status: 400 });
  }

  const claim = await db.submissionTestRun.updateMany({
    where: { id: body.testRunId, status: "QUEUED" },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  if (claim.count === 0) {
    return NextResponse.json({ claimed: false });
  }

  const run = await db.submissionTestRun.findUnique({
    where: { id: body.testRunId },
    select: {
      id: true,
      submissionId: true,
      assignmentId: true,
      submission: { select: { id: true, data: true, attachmentId: true } },
      assignment: {
        select: { id: true, sandboxTemplate: true, hiddenTestFiles: true },
      },
    },
  });

  return NextResponse.json({ claimed: true, run });
}
