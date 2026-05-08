import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";

import { env } from "./env.js";
import { processVideoJob, type VideoJobData } from "./job.js";
import { logger } from "./logger.js";

const QUEUE_NAME = "video-transcode";

export const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const videoQueue = new Queue<VideoJobData>(QUEUE_NAME, { connection });

export function startWorker() {
  const worker = new Worker<VideoJobData>(
    QUEUE_NAME,
    async (job) => processVideoJob(job.data, job),
    {
      connection,
      concurrency: env.CONCURRENCY,
      // Long jobs — don't time out the lock
      lockDuration: 60_000 * 60 * 6, // 6 hours
      stalledInterval: 30_000,
    },
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, videoId: job.data.videoId }, "job completed");
  });
  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, videoId: job?.data.videoId, err }, "job failed");
  });
  worker.on("error", (err) => logger.error({ err }, "worker error"));

  return worker;
}

export async function enqueueVideoJob(data: VideoJobData): Promise<string> {
  const job = await videoQueue.add("transcode", data, {
    attempts: 2,
    backoff: { type: "exponential", delay: 30_000 },
    removeOnComplete: { count: 100, age: 86400 },
    removeOnFail: { count: 100, age: 86400 * 7 },
  });
  return job.id ?? "unknown";
}
