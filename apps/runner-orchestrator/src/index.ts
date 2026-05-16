import { spawn } from "node:child_process";
import { timingSafeEqual } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import express from "express";

import { dashboardHtml, getDashboardState } from "./dashboard.js";
import { db } from "./db.js";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { enqueue, getQueueSnapshot } from "./queue.js";

function pullJestImage(): Promise<void> {
  return new Promise((resolve) => {
    logger.info({ image: env.JEST_IMAGE }, "pulling jest image");
    const child = spawn("docker", ["pull", env.JEST_IMAGE], { stdio: "pipe" });
    let stderr = "";
    child.stderr?.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    child.on("exit", (code) => {
      if (code === 0) {
        logger.info({ image: env.JEST_IMAGE }, "jest image pull complete");
      } else {
        logger.warn(
          { image: env.JEST_IMAGE, exitCode: code, stderr: stderr.slice(-400) },
          "jest image pull failed; falling back to local cache",
        );
      }
      resolve();
    });
    child.on("error", (err) => {
      logger.warn({ err: err.message }, "docker pull spawn failed");
      resolve();
    });
  });
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

await rm(env.WORK_DIR, { recursive: true, force: true }).catch(() => undefined);
await mkdir(env.WORK_DIR, { recursive: true }).catch(() => undefined);
logger.info({ workDir: env.WORK_DIR }, "work dir reset");

if (env.USE_DOCKER) {
  await pullJestImage();
}

// Mark abandoned RUNNING rows as ERROR (previous orchestrator crashed mid-job).
try {
  const reapResult = await db.submissionTestRun.updateMany({
    where: { status: "RUNNING" },
    data: {
      status: "ERROR",
      errorMessage: "runner restarted while job was in flight",
      completedAt: new Date(),
    },
  });
  if (reapResult.count > 0) {
    logger.warn(
      { count: reapResult.count },
      "marked abandoned RUNNING rows as ERROR",
    );
  }
} catch (err) {
  logger.error({ err }, "boot reap failed");
}

// Re-enqueue recent QUEUED rows that didn't get processed before restart.
try {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const pending = await db.submissionTestRun.findMany({
    where: { status: "QUEUED", createdAt: { gt: cutoff } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  if (pending.length > 0) {
    logger.info({ count: pending.length }, "re-enqueuing recent QUEUED rows");
    for (const row of pending) {
      enqueue(row.id);
    }
  }
} catch (err) {
  logger.error({ err }, "boot enqueue failed");
}

const app = express();
app.use(express.json({ limit: "1mb" }));

function checkSecret(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const got = req.header("x-worker-secret");
  if (typeof got !== "string" || !safeEqual(got, env.TEST_RUNNER_SECRET)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, ...getQueueSnapshot() });
});

app.post("/enqueue", checkSecret, (req, res) => {
  const body = req.body as { testRunId?: unknown } | undefined;
  if (!body || typeof body.testRunId !== "string") {
    res.status(400).json({ error: "testRunId required" });
    return;
  }
  enqueue(body.testRunId);
  res.json({ ok: true });
});

app.post("/enqueue-batch", checkSecret, (req, res) => {
  const body = req.body as { testRunIds?: unknown } | undefined;
  if (!body || !Array.isArray(body.testRunIds)) {
    res.status(400).json({ error: "testRunIds array required" });
    return;
  }
  let queued = 0;
  for (const id of body.testRunIds) {
    if (typeof id === "string") {
      enqueue(id);
      queued += 1;
    }
  }
  res.json({ ok: true, queued });
});

app.get("/internal/queue", checkSecret, (_req, res) => {
  res.json(getQueueSnapshot());
});

// Lightweight in-process dashboard. No auth on the HTML (it ships no secrets);
// in prod, lock the orchestrator off the public internet (Coolify internal network).
// Mirrors the video-worker's `/admin/queues` URL so the muscle memory carries over.
app.get(["/", "/dashboard", "/admin/queues"], (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(dashboardHtml());
});

app.get("/dashboard/data", async (_req, res) => {
  try {
    const state = await getDashboardState();
    res.json(state);
  } catch (err) {
    logger.error({ err }, "dashboard data failed");
    res.status(500).json({ error: "dashboard query failed" });
  }
});

const server = app.listen(env.TEST_RUNNER_PORT, () => {
  logger.info({ port: env.TEST_RUNNER_PORT }, "runner-orchestrator listening");
});

const reaperInterval = setInterval(
  async () => {
    try {
      const cutoff = new Date(Date.now() - 15 * 60 * 1000);
      const result = await db.submissionTestRun.updateMany({
        where: { status: "RUNNING", startedAt: { lt: cutoff } },
        data: {
          status: "ERROR",
          errorMessage: "runner timeout (reaped)",
          completedAt: new Date(),
        },
      });
      if (result.count > 0) {
        logger.warn({ reaped: result.count }, "reaped stale RUNNING rows");
      }
    } catch (err) {
      logger.error({ err }, "reaper failed");
    }
  },
  5 * 60 * 1000,
);

async function shutdown() {
  logger.info("shutting down…");
  clearInterval(reaperInterval);
  server.close();
  await db.$disconnect().catch(() => undefined);
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
