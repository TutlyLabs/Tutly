import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Job } from "bullmq";

import { db } from "./db.js";
import { env } from "./env.js";
import {
  RENDITIONS,
  generateThumbnail,
  listSegments,
  masterPlaylist,
  probeDuration,
  transcodeRendition,
} from "./ffmpeg.js";
import { logger } from "./logger.js";
import {
  deleteObject,
  downloadObject,
  publicUrl,
  uploadFile,
} from "./s3.js";

export interface VideoJobData {
  videoId: string;
  rawObjectKey: string;
}

const HLS_BASE_PREFIX = "videos/hls";

// Phase weights — must sum to 100. Tuned for typical class videos where
// 1080p encoding dominates and uploads are usually fast over LAN/CDN ingress.
const WEIGHTS = {
  download: 5,
  encode480: 25,
  encode720: 30,
  encode1080: 30,
  thumb: 2,
  upload: 8,
};

type ProgressUpdater = (_overallPct: number, _step: string) => Promise<void>;

function buildProgressUpdater(
  videoId: string,
  job: Job | undefined,
): ProgressUpdater {
  let lastWriteAt = 0;
  let lastPct = -1;
  let lastStep: string | null = null;
  return async (overallPct, step) => {
    const pct = Math.max(0, Math.min(100, Math.round(overallPct)));
    const now = Date.now();
    const shouldFlush =
      step !== lastStep ||
      pct === 100 ||
      pct >= 92 ||
      pct !== lastPct ||
      now - lastWriteAt >= 1500;
    if (!shouldFlush) return;
    if (pct === lastPct && step === lastStep && now - lastWriteAt < 500) return;
    lastWriteAt = now;
    lastPct = pct;
    lastStep = step;
    try {
      await db.video.update({
        where: { id: videoId },
        data: { progress: pct, progressStep: step },
      });
      if (job) await job.updateProgress(pct);
    } catch (e) {
      logger.warn({ err: e, videoId }, "progress update failed");
    }
  };
}

export async function processVideoJob(
  data: VideoJobData,
  job?: Job,
): Promise<void> {
  const { videoId, rawObjectKey } = data;
  const log = logger.child({ videoId });

  const workDir = path.join(env.WORK_DIR, videoId);
  const rawPath = path.join(workDir, path.basename(rawObjectKey));
  const outDir = path.join(workDir, "hls");

  log.info({ workDir }, "starting video job");

  // Mark started
  await db.video.update({
    where: { id: videoId },
    data: {
      processStartedAt: new Date(),
      processEndedAt: null,
      progress: 0,
      progressStep: "Queued",
      errorMessage: null,
    },
  });

  const setProgress = buildProgressUpdater(videoId, job);

  try {
    await mkdir(outDir, { recursive: true });

    // 1. Download phase
    await setProgress(0, "Downloading source");
    log.info({ rawObjectKey }, "downloading raw");
    const size = await downloadObject(rawObjectKey, rawPath);
    await setProgress(WEIGHTS.download, "Downloaded source");
    log.info({ size }, "raw downloaded");

    const duration = await probeDuration(rawPath);
    log.info({ duration }, "probed duration");

    // 2. Encode each rendition
    let cumulative = WEIGHTS.download;
    const renditionWeights = [
      WEIGHTS.encode480,
      WEIGHTS.encode720,
      WEIGHTS.encode1080,
    ];

    for (let i = 0; i < RENDITIONS.length; i++) {
      const r = RENDITIONS[i]!;
      const w = renditionWeights[i] ?? 0;
      const start = cumulative;
      log.info({ rendition: r.name }, "transcoding rendition");

      await transcodeRendition(rawPath, outDir, r, duration, async (frac) => {
        await setProgress(start + w * frac, `Encoding ${r.name}`);
      });

      cumulative += w;
      await setProgress(cumulative, `Encoded ${r.name}`);
    }

    // 3. Master playlist
    const masterPath = path.join(outDir, "master.m3u8");
    await writeFile(masterPath, masterPlaylist(), "utf8");

    // 4. Thumbnail
    const thumbPath = path.join(outDir, "thumbnail.jpg");
    await setProgress(cumulative, "Generating thumbnail");
    try {
      await generateThumbnail(
        rawPath,
        thumbPath,
        Math.min(5, Math.max(1, Math.floor(duration / 20))),
      );
    } catch (e) {
      log.warn({ err: e }, "thumbnail generation failed (non-fatal)");
    }
    cumulative += WEIGHTS.thumb;
    await setProgress(cumulative, "Thumbnail ready");

    // 5. Upload outputs
    const hlsPrefix = `${HLS_BASE_PREFIX}/${videoId}`;
    log.info({ hlsPrefix }, "uploading HLS outputs");
    await setProgress(cumulative, "Uploading to CDN");

    await uploadFile(`${hlsPrefix}/master.m3u8`, masterPath, {
      contentType: "application/vnd.apple.mpegurl",
      cacheControl: "public, max-age=30",
    });

    // Count total upload units for progress increments inside the upload phase
    const allUploadItems: { key: string; localPath: string; isPlaylist: boolean }[] =
      [];
    for (const r of RENDITIONS) {
      const renditionDir = path.join(outDir, r.name);
      const items = await listSegments(renditionDir);
      for (const name of items) {
        allUploadItems.push({
          key: `${hlsPrefix}/${r.name}/${name}`,
          localPath: path.join(renditionDir, name),
          isPlaylist: name.endsWith(".m3u8"),
        });
      }
    }
    const uploadStart = cumulative;
    for (let i = 0; i < allUploadItems.length; i++) {
      const item = allUploadItems[i]!;
      await uploadFile(item.key, item.localPath, {
        contentType: item.isPlaylist
          ? "application/vnd.apple.mpegurl"
          : "video/MP2T",
        cacheControl: item.isPlaylist
          ? "public, max-age=30"
          : "public, max-age=2592000, immutable",
      });
      await setProgress(
        uploadStart + (WEIGHTS.upload * (i + 1)) / allUploadItems.length,
        "Uploading to CDN",
      );
    }
    cumulative = uploadStart + WEIGHTS.upload;

    let thumbnailUrl: string | undefined;
    try {
      await uploadFile(`${hlsPrefix}/thumbnail.jpg`, thumbPath, {
        contentType: "image/jpeg",
        cacheControl: "public, max-age=2592000",
      });
      thumbnailUrl = publicUrl(`${hlsPrefix}/thumbnail.jpg`);
    } catch (e) {
      log.warn({ err: e }, "thumbnail upload failed (non-fatal)");
    }

    const hlsPlaylistUrl = publicUrl(`${hlsPrefix}/master.m3u8`);

    await db.video.update({
      where: { id: videoId },
      data: {
        status: "READY",
        hlsPlaylistUrl,
        thumbnailUrl: thumbnailUrl ?? null,
        duration,
        videoLink: hlsPlaylistUrl,
        errorMessage: null,
        progress: 100,
        progressStep: "Ready",
        processEndedAt: new Date(),
      },
    });
    if (job) await job.updateProgress(100);

    log.info({ hlsPlaylistUrl, duration }, "video ready");

    await deleteObject(rawObjectKey).catch(() => undefined);
  } catch (err) {
    log.error({ err }, "video job failed");
    const raw = err instanceof Error ? err.message : String(err);
    const errorMessage = raw.length > 500 ? raw.slice(0, 500) + "…" : raw;
    await db.video.update({
      where: { id: videoId },
      data: {
        status: "FAILED",
        errorMessage,
        progressStep: "Failed",
        processEndedAt: new Date(),
      },
    });
    throw err;
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
