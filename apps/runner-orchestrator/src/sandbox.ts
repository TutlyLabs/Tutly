import { existsSync } from "node:fs";
import { copyFile, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "./env.js";

type SandpackFile =
  | string
  | {
      code?: string;
      hidden?: boolean;
      active?: boolean;
      readOnly?: boolean;
    };

type SandpackTemplate = {
  files?: Record<string, SandpackFile>;
  template?: string;
  options?: Record<string, unknown>;
};

function decodeTemplate(
  base64: string | null | undefined,
): SandpackTemplate | null {
  if (!base64) return null;
  try {
    const decoded = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(decoded) as SandpackTemplate;
  } catch {
    return null;
  }
}

function fileContent(entry: SandpackFile): string {
  if (typeof entry === "string") return entry;
  return entry.code ?? "";
}

function normalizePath(p: string): string {
  return p.startsWith("/") ? p.slice(1) : p;
}

const TEST_FILE_REGEX = /\.(test|spec)\.[tj]sx?$/;

export type AssembledWorkspace = {
  cwd: string;
  visibleTestPaths: string[];
  hiddenTestPaths: string[];
};

export async function assembleWorkspace(opts: {
  testRunId: string;
  submissionData: unknown;
  sandboxTemplate: string | null;
  hiddenTestFiles: Record<string, string> | null;
}): Promise<AssembledWorkspace> {
  const cwd = path.join(env.WORK_DIR, `run-${opts.testRunId}-${Date.now()}`);
  await mkdir(cwd, { recursive: true });

  const targetModules = path.join(cwd, "node_modules");
  const sourceModules = path.join(env.RUNTIME_DIR, "node_modules");
  if (existsSync(sourceModules)) {
    await symlink(sourceModules, targetModules, "dir").catch(() => undefined);
  }

  for (const file of ["jest.config.cjs", "tsconfig.json", "package.json"]) {
    const src = path.join(env.RUNTIME_DIR, file);
    if (existsSync(src)) {
      await copyFile(src, path.join(cwd, file)).catch(() => undefined);
    }
  }

  const template = decodeTemplate(opts.sandboxTemplate);
  const templateFiles = template?.files ?? {};
  const submissionFiles =
    opts.submissionData && typeof opts.submissionData === "object"
      ? (opts.submissionData as Record<string, SandpackFile>)
      : {};

  const visibleTestPaths: string[] = [];
  const hiddenTestPaths: string[] = [];

  // Write order matters: template, then student overlay, then re-apply visible
  // tests (so students can't disable them by editing), then hidden tests.
  for (const [filePath, entry] of Object.entries(templateFiles)) {
    if (typeof entry === "object" && entry.hidden === true) continue;
    const out = path.join(cwd, normalizePath(filePath));
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, fileContent(entry), "utf-8");
  }

  for (const [filePath, entry] of Object.entries(submissionFiles)) {
    const out = path.join(cwd, normalizePath(filePath));
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, fileContent(entry), "utf-8");
  }

  for (const [filePath, entry] of Object.entries(templateFiles)) {
    if (!TEST_FILE_REGEX.test(filePath)) continue;
    if (typeof entry === "object" && entry.hidden === true) continue;
    const out = path.join(cwd, normalizePath(filePath));
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, fileContent(entry), "utf-8");
    visibleTestPaths.push(normalizePath(filePath));
  }

  const hidden = opts.hiddenTestFiles ?? {};
  for (const [filePath, source] of Object.entries(hidden)) {
    const normalized = normalizePath(filePath);
    const safePath = normalized.startsWith("__hidden__/")
      ? normalized
      : `__hidden__/${normalized}`;
    const out = path.join(cwd, safePath);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, source, "utf-8");
    hiddenTestPaths.push(safePath);
  }

  return { cwd, visibleTestPaths, hiddenTestPaths };
}

export async function cleanupWorkspace(cwd: string): Promise<void> {
  await rm(cwd, { recursive: true, force: true }).catch(() => undefined);
}
