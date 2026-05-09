import { db } from "./db.js";
import { logger } from "./logger.js";

export async function notifyUploader(
  videoId: string,
  outcome: "READY" | "FAILED",
  errorMessage?: string,
): Promise<void> {
  try {
    const video = await db.video.findUnique({
      where: { id: videoId },
      select: {
        uploadedById: true,
        class: { select: { id: true, title: true } },
      },
    });
    if (!video?.uploadedById) return;

    const cls = video.class[0];
    const classTitle = cls?.title ?? "your class video";
    const message =
      outcome === "READY"
        ? `Video for "${classTitle}" is ready to play.`
        : `Video for "${classTitle}" failed to process${
            errorMessage ? `: ${errorMessage}` : "."
          }`;

    await db.notification.create({
      data: {
        intendedForId: video.uploadedById,
        eventType: "CUSTOM_MESSAGE",
        message,
        customLink: "/tutor/video-runs",
        causedObjects: { videoId, outcome, classId: cls?.id ?? null },
      },
    });
  } catch (err) {
    logger.warn({ err, videoId, outcome }, "failed to write notification");
  }
}
