import { z } from "zod";

const schema = z.object({
  PORT: z
    .string()
    .default("4400")
    .transform((s) => Number(s)),
  WORKER_SECRET: z.string().min(16, "WORKER_SECRET must be at least 16 chars"),

  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),

  AWS_BUCKET_NAME: z.string(),
  AWS_BUCKET_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY: z.string(),
  AWS_SECRET_KEY: z.string(),
  AWS_ENDPOINT: z.string().optional(),
  AWS_S3_PUBLIC_URL: z
    .string()
    .describe("Public-readable base URL for HLS objects (e.g. https://video.example.com)"),

  FFMPEG_PATH: z.string().optional(),
  FFPROBE_PATH: z.string().optional(),

  WORK_DIR: z.string().default("/tmp/tutly-video-worker"),
  CONCURRENCY: z
    .string()
    .default("1")
    .transform((s) => Number(s)),

  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
});

export const env = schema.parse(process.env);
