import { env } from "./env.js";
import { processJob } from "./job.js";
import { logger } from "./logger.js";

type Job = { testRunId: string; enqueuedAt: number };

const pending: Job[] = [];
const active = new Set<string>();

export function getQueueSnapshot() {
  return {
    queueDepth: pending.length,
    active: active.size,
    activeIds: Array.from(active),
    pendingIds: pending.map((job) => job.testRunId),
  };
}

export function enqueue(testRunId: string) {
  if (
    active.has(testRunId) ||
    pending.find((job) => job.testRunId === testRunId)
  ) {
    logger.debug({ testRunId }, "already queued or running, ignoring");
    return;
  }
  pending.push({ testRunId, enqueuedAt: Date.now() });
  logger.info({ testRunId, depth: pending.length }, "enqueued");
  void tick();
}

let ticking = false;
async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    while (pending.length > 0 && active.size < env.CONCURRENCY) {
      const job = pending.shift();
      if (!job) break;
      active.add(job.testRunId);
      runJob(job.testRunId).finally(() => {
        active.delete(job.testRunId);
        void tick();
      });
    }
  } finally {
    ticking = false;
  }
}

async function runJob(testRunId: string) {
  try {
    await processJob(testRunId);
  } catch (err) {
    logger.error({ err, testRunId }, "job runner crashed");
  }
}
