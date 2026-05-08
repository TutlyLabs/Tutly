import { timingSafeEqual } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";

import express from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

import { env } from "./env.js";
import { logger } from "./logger.js";
import { enqueueVideoJob, startWorker, videoQueue } from "./queue.js";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// Clean any stale temp directories left over from killed jobs before we start.
await rm(env.WORK_DIR, { recursive: true, force: true }).catch(() => undefined);
await mkdir(env.WORK_DIR, { recursive: true }).catch(() => undefined);
logger.info({ workDir: env.WORK_DIR }, "work dir reset");

const app = express();
app.use(express.json({ limit: "1mb" }));

function checkSecret(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const got = req.header("x-worker-secret");
  if (typeof got !== "string" || !safeEqual(got, env.WORKER_SECRET)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

function basicAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const header = req.header("authorization");
  if (header?.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const [, password] = decoded.split(":");
    if (password && safeEqual(password, env.WORKER_SECRET)) {
      next();
      return;
    }
  }
  res.set("WWW-Authenticate", 'Basic realm="tutly-video-worker"');
  res.status(401).send("Authentication required");
}

const bullAdapter = new ExpressAdapter();
bullAdapter.setBasePath("/admin/queues");
createBullBoard({
  queues: [new BullMQAdapter(videoQueue)],
  serverAdapter: bullAdapter,
});
app.use("/admin/queues", basicAuth, bullAdapter.getRouter());

app.get("/health", async (_req, res) => {
  const counts = await videoQueue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
  );
  res.json({ ok: true, queue: counts });
});

app.post("/enqueue", checkSecret, async (req, res) => {
  const { videoId, rawObjectKey } = req.body ?? {};
  if (typeof videoId !== "string" || typeof rawObjectKey !== "string") {
    res.status(400).json({ error: "videoId + rawObjectKey required" });
    return;
  }
  try {
    const jobId = await enqueueVideoJob({ videoId, rawObjectKey });
    logger.info({ videoId, jobId }, "enqueued job");
    res.json({ ok: true, jobId });
  } catch (e) {
    logger.error({ err: e, videoId }, "enqueue failed");
    res.status(500).json({ error: "enqueue failed" });
  }
});

const worker = startWorker();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "video-worker http listening");
});

async function shutdown() {
  logger.info("shutting down…");
  await worker.close();
  server.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
