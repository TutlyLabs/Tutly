import { db } from "./db.js";
import { logger } from "./logger.js";
import { notifyUploader } from "./notify.js";

const STUCK_THRESHOLD_MS = 30 * 60 * 1000;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const ALERT_GRACE_MS = STUCK_THRESHOLD_MS;

let timer: ReturnType<typeof setInterval> | null = null;

async function sweepOnce(): Promise<void> {
  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS);
  const stuck = await db.video.findMany({
    where: {
      status: "PROCESSING",
      processStartedAt: { lt: cutoff },
    },
    select: { id: true, processStartedAt: true, errorMessage: true },
  });
  if (stuck.length === 0) return;

  logger.warn({ count: stuck.length }, "stuck videos detected");
  for (const v of stuck) {
    // Fingerprint each alert so we don't notify on every sweep.
    const alreadyAlerted = (v.errorMessage ?? "").startsWith("[stuck]");
    if (alreadyAlerted) continue;

    await db.video
      .update({
        where: { id: v.id },
        data: {
          errorMessage: `[stuck] processing for >${Math.round(
            (Date.now() - (v.processStartedAt?.getTime() ?? Date.now())) /
              60000,
          )}m`,
        },
      })
      .catch(() => undefined);
    await notifyUploader(v.id, "FAILED", "Transcode appears stuck");
  }
}

export function startWatchdog(): void {
  if (timer) return;
  // Stagger first run by ALERT_GRACE_MS so the worker has time to finish jobs
  // started right before its restart before we declare them stuck.
  setTimeout(() => {
    void sweepOnce().catch((err) =>
      logger.error({ err }, "watchdog sweep error"),
    );
    timer = setInterval(() => {
      void sweepOnce().catch((err) =>
        logger.error({ err }, "watchdog sweep error"),
      );
    }, SWEEP_INTERVAL_MS);
  }, ALERT_GRACE_MS);
}

export function stopWatchdog(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
