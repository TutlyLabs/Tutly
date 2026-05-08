import { spawn } from "node:child_process";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

import ffmpeg from "fluent-ffmpeg";

import { env } from "./env.js";
import { logger } from "./logger.js";

if (env.FFMPEG_PATH) ffmpeg.setFfmpegPath(env.FFMPEG_PATH);
if (env.FFPROBE_PATH) ffmpeg.setFfprobePath(env.FFPROBE_PATH);

export interface Rendition {
  name: "480p" | "720p" | "1080p";
  width: number;
  height: number;
  videoBitrate: string; // e.g. "800k"
  audioBitrate: string;
  bandwidth: number; // for master playlist
}

export const RENDITIONS: Rendition[] = [
  {
    name: "480p",
    width: 854,
    height: 480,
    videoBitrate: "800k",
    audioBitrate: "96k",
    bandwidth: 900_000,
  },
  {
    name: "720p",
    width: 1280,
    height: 720,
    videoBitrate: "2000k",
    audioBitrate: "128k",
    bandwidth: 2_200_000,
  },
  {
    name: "1080p",
    width: 1920,
    height: 1080,
    videoBitrate: "4000k",
    audioBitrate: "192k",
    bandwidth: 4_300_000,
  },
];

export async function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      const dur = data?.format?.duration;
      if (!dur) return reject(new Error("Could not probe duration"));
      resolve(Math.round(dur));
    });
  });
}

/**
 * Transcode a single rendition to HLS.
 * Outputs: <outDir>/<name>/index.m3u8 + segNNN.ts
 *
 * onProgress receives a 0–1 fraction representing how far through this
 * rendition's input we are, derived from ffmpeg's `out_time_us` divided
 * by the total `durationSeconds` we already probed.
 */
export async function transcodeRendition(
  inputPath: string,
  outDir: string,
  r: Rendition,
  durationSeconds: number,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  const renditionDir = path.join(outDir, r.name);
  await mkdir(renditionDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const args = [
      "-nostdin",
      "-i", inputPath,
      "-vf", `scale=w=${r.width}:h=${r.height}:force_original_aspect_ratio=decrease,pad=${r.width}:${r.height}:(ow-iw)/2:(oh-ih)/2`,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-profile:v", "main",
      "-level", "4.0",
      "-pix_fmt", "yuv420p",
      "-b:v", r.videoBitrate,
      "-maxrate", r.videoBitrate,
      "-bufsize", `${parseInt(r.videoBitrate) * 2}k`,
      "-g", "48",
      "-keyint_min", "48",
      "-sc_threshold", "0",
      "-c:a", "aac",
      "-b:a", r.audioBitrate,
      "-ac", "2",
      "-hls_time", "6",
      "-hls_playlist_type", "vod",
      "-hls_segment_filename", path.join(renditionDir, "seg%03d.ts"),
      "-f", "hls",
      "-progress", "pipe:1",
      "-nostats",
      "-y",
      path.join(renditionDir, "index.m3u8"),
    ];

    const cmd = env.FFMPEG_PATH ?? "ffmpeg";
    logger.info({ rendition: r.name, cmd }, "starting ffmpeg");
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });

    let stdoutBuf = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      stdoutBuf += chunk.toString();
      let nl: number;
      while ((nl = stdoutBuf.indexOf("\n")) !== -1) {
        const line = stdoutBuf.slice(0, nl).trim();
        stdoutBuf = stdoutBuf.slice(nl + 1);
        if (line.startsWith("out_time_us=") && onProgress) {
          const us = Number(line.slice("out_time_us=".length));
          if (Number.isFinite(us) && durationSeconds > 0) {
            const frac = Math.max(0, Math.min(1, us / 1_000_000 / durationSeconds));
            onProgress(frac);
          }
        }
      }
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      const s = chunk.toString();
      if (s.includes("Error") || s.includes("error")) {
        logger.warn({ rendition: r.name, line: s.trim() }, "ffmpeg stderr");
      }
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        onProgress?.(1);
        resolve();
      } else {
        reject(new Error(`ffmpeg ${r.name} exited with code ${code}`));
      }
    });
  });
}

export async function generateThumbnail(
  inputPath: string,
  outPath: string,
  atSeconds = 5,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = env.FFMPEG_PATH ?? "ffmpeg";
    const proc = spawn(cmd, [
      "-ss", String(atSeconds),
      "-i", inputPath,
      "-frames:v", "1",
      "-vf", "scale=1280:-2",
      "-q:v", "3",
      "-y",
      outPath,
    ]);
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`thumbnail ffmpeg exited with code ${code}`));
    });
  });
}

export function masterPlaylist(): string {
  const lines: string[] = ["#EXTM3U", "#EXT-X-VERSION:3"];
  for (const r of RENDITIONS) {
    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${r.bandwidth},RESOLUTION=${r.width}x${r.height},NAME="${r.name}"`,
    );
    lines.push(`${r.name}/index.m3u8`);
  }
  return lines.join("\n") + "\n";
}

export async function listSegments(renditionDir: string): Promise<string[]> {
  const entries = await readdir(renditionDir);
  return entries.filter((e) => e.endsWith(".ts") || e.endsWith(".m3u8"));
}
