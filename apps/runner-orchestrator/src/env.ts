import { z } from "zod";

const schema = z.object({
  TEST_RUNNER_PORT: z
    .string()
    .default("3010")
    .transform((s) => Number(s)),
  TEST_RUNNER_SECRET: z
    .string()
    .min(16, "TEST_RUNNER_SECRET must be at least 16 chars"),

  WEB_BASE_URL: z.string().url(),

  WORK_DIR: z.string().default("/tmp/tutly-runner"),
  RUNTIME_DIR: z.string(),

  // "jest": node + happy-dom, fast/cheap. "browser": real Sandpack bundler in
  // headless Chromium, matches the editor preview but slower and heavier.
  RUNNER_MODE: z.enum(["jest", "browser"]).default("jest"),

  CONCURRENCY: z
    .string()
    .default("2")
    .transform((s) => Number(s)),
  JOB_TIMEOUT_MS: z
    .string()
    .default("120000")
    .transform((s) => Number(s)),
  // Defaults per mode below.
  JOB_MEMORY_MB: z
    .string()
    .regex(/^\d+$/, "JOB_MEMORY_MB must be an integer")
    .optional(),
  JOB_CPU_LIMIT: z
    .string()
    .default("1.0")
    .transform((s) => Number(s)),
  JOB_PIDS_LIMIT: z
    .string()
    .default("128")
    .transform((s) => Number(s)),

  USE_DOCKER: z
    .string()
    .default("true")
    .transform((s) => s === "true" || s === "1"),
  JEST_IMAGE: z.string().default("ghcr.io/tutlylabs/tutly-jest-runner:latest"),
  BROWSER_IMAGE: z
    .string()
    .default("ghcr.io/tutlylabs/tutly-browser-runner:latest"),
  // Host path the Docker daemon sees when bind-mounting WORK_DIR. Defaults to WORK_DIR.
  WORK_DIR_HOST: z.string().optional(),

  DATABASE_URL: z.string(),

  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error"])
    .default("info"),
});

const parsed = schema.parse(process.env);

const DEFAULT_JOB_MEMORY_MB = { jest: 512, browser: 640 } as const;

export const env = {
  ...parsed,
  JOB_MEMORY_MB: parsed.JOB_MEMORY_MB
    ? Number(parsed.JOB_MEMORY_MB)
    : DEFAULT_JOB_MEMORY_MB[parsed.RUNNER_MODE],
};

export function runnerImage(): string {
  return env.RUNNER_MODE === "browser" ? env.BROWSER_IMAGE : env.JEST_IMAGE;
}
