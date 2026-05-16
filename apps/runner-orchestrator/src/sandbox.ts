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

// Join an untrusted relative path under a trusted base, rejecting traversal.
function safeJoin(base: string, rel: string): string {
  if (rel.includes("\0")) {
    throw new Error("invalid path: null byte");
  }
  const resolvedBase = path.resolve(base);
  const resolved = path.resolve(resolvedBase, rel);
  if (
    resolved !== resolvedBase &&
    !resolved.startsWith(resolvedBase + path.sep)
  ) {
    throw new Error(`path escapes workspace: ${rel}`);
  }
  return resolved;
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
  const runId = path.basename(opts.testRunId).replace(/[^a-zA-Z0-9_-]/g, "");
  const cwd = path.resolve(env.WORK_DIR, `run-${runId}-${Date.now()}`);
  await mkdir(cwd, { recursive: true });

  const targetModules = safeJoin(cwd, "node_modules");
  const sourceModules = path.resolve(env.RUNTIME_DIR, "node_modules");
  if (existsSync(sourceModules)) {
    await symlink(sourceModules, targetModules, "dir").catch(() => undefined);
  }

  for (const file of ["jest.config.cjs", "tsconfig.json", "package.json"]) {
    const src = path.resolve(env.RUNTIME_DIR, file);
    if (existsSync(src)) {
      await copyFile(src, safeJoin(cwd, file)).catch(() => undefined);
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

  const writeUntrusted = async (filePath: string, content: string) => {
    let out: string;
    try {
      out = safeJoin(cwd, normalizePath(filePath));
    } catch {
      return null;
    }
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, content, "utf-8");
    return out;
  };

  // Write order matters: template, then student overlay, then re-apply visible
  // tests (so students can't disable them by editing), then hidden tests.
  for (const [filePath, entry] of Object.entries(templateFiles)) {
    if (typeof entry === "object" && entry.hidden === true) continue;
    await writeUntrusted(filePath, fileContent(entry));
  }

  for (const [filePath, entry] of Object.entries(submissionFiles)) {
    await writeUntrusted(filePath, fileContent(entry));
  }

  for (const [filePath, entry] of Object.entries(templateFiles)) {
    if (!TEST_FILE_REGEX.test(filePath)) continue;
    if (typeof entry === "object" && entry.hidden === true) continue;
    const written = await writeUntrusted(filePath, fileContent(entry));
    if (written) visibleTestPaths.push(normalizePath(filePath));
  }

  const hidden = opts.hiddenTestFiles ?? {};
  for (const [filePath, source] of Object.entries(hidden)) {
    const normalized = normalizePath(filePath);
    const safePath = normalized.startsWith("__hidden__/")
      ? normalized
      : `__hidden__/${normalized}`;
    const written = await writeUntrusted(safePath, source);
    if (written) hiddenTestPaths.push(safePath);
  }

  return { cwd, visibleTestPaths, hiddenTestPaths };
}

export async function cleanupWorkspace(cwd: string): Promise<void> {
  await rm(cwd, { recursive: true, force: true }).catch(() => undefined);
}
