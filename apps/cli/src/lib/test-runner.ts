import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ALLOWED_RUNNERS: Record<string, { bin: string; baseArgs: string[] }> = {
  "npm test": { bin: "npm", baseArgs: ["test"] },
  "pnpm test": { bin: "pnpm", baseArgs: ["test"] },
  "yarn test": { bin: "yarn", baseArgs: ["test"] },
  "npx jest": { bin: "npx", baseArgs: ["jest"] },
  "npx mocha": { bin: "npx", baseArgs: ["mocha"] },
  "npx vitest": { bin: "npx", baseArgs: ["vitest"] },
  jest: { bin: "jest", baseArgs: [] },
  mocha: { bin: "mocha", baseArgs: [] },
  vitest: { bin: "vitest", baseArgs: [] },
};

const ALLOWED_EXTRA_ARG_PATTERN = /^[\w\-./@:=,]+$/;

export function allowedTestCommands() {
  return Object.keys(ALLOWED_RUNNERS);
}

export function resolveTestCommand(
  raw: unknown,
): { bin: string; argv: string[]; raw: string } | { error: string } {
  if (typeof raw !== "string") return { error: "command must be a string" };
  const matchedKey = Object.keys(ALLOWED_RUNNERS)
    .sort((a, b) => b.length - a.length)
    .find((key) => raw === key || raw.startsWith(key + " "));

  if (!matchedKey) return { error: "Command not allowed" };

  const { bin, baseArgs } = ALLOWED_RUNNERS[matchedKey]!;
  const trailing = raw.slice(matchedKey.length).trim();
  const extras = trailing.length === 0 ? [] : trailing.split(/\s+/);
  for (const arg of extras) {
    if (!ALLOWED_EXTRA_ARG_PATTERN.test(arg)) {
      return { error: `Invalid argument: ${arg}` };
    }
  }

  return { bin, argv: [...baseArgs, ...extras], raw };
}

export async function runVisibleTestCommand(input: {
  command: string;
  cwd: string;
  timeoutMs?: number;
}) {
  const resolved = resolveTestCommand(input.command);
  if ("error" in resolved) {
    return { ok: false, error: resolved.error, allowedRunners: allowedTestCommands() };
  }

  const startedAt = Date.now();
  try {
    const { stdout, stderr } = await execFileAsync(resolved.bin, resolved.argv, {
      cwd: input.cwd,
      timeout: input.timeoutMs ?? 120000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return normalizeTestOutput({
      command: input.command,
      stdout,
      stderr,
      exitCode: 0,
      durationMs: Date.now() - startedAt,
    });
  } catch (error: any) {
    return normalizeTestOutput({
      command: input.command,
      stdout: error.stdout || "",
      stderr: error.stderr || "",
      exitCode: typeof error.code === "number" ? error.code : 1,
      message: error.message,
      durationMs: Date.now() - startedAt,
    });
  }
}

function normalizeTestOutput(input: {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  message?: string;
  durationMs: number;
}) {
  const parsed = parseJson(input.stdout);
  const tests = Array.isArray(parsed?.tests) ? parsed.tests : [];

  if (tests.length > 0) {
    const results = tests.map((test: any) => ({
      title: String(test.fullTitle ?? test.name ?? test.title ?? input.command),
      visibility: "VISIBLE",
      passed: !test.err && test.state !== "failed" && test.status !== "failed",
      durationMs: Number(test.duration ?? input.durationMs) || input.durationMs,
      output: String(test.err?.message ?? ""),
      metadata: { command: input.command },
    }));

    return {
      ok: input.exitCode === 0,
      stats: parsed.stats,
      tests,
      results,
      rawOutput: input.stdout,
      stderr: input.stderr,
      exitCode: input.exitCode,
      durationMs: input.durationMs,
    };
  }

  return {
    ok: input.exitCode === 0,
    stats: {
      suites: 1,
      tests: 1,
      passes: input.exitCode === 0 ? 1 : 0,
      failures: input.exitCode === 0 ? 0 : 1,
      pending: 0,
      duration: input.durationMs,
    },
    tests: [],
    results: [
      {
        title: input.command,
        visibility: "VISIBLE",
        passed: input.exitCode === 0,
        durationMs: input.durationMs,
        output: input.stdout,
        error: input.message ?? input.stderr,
        metadata: { command: input.command },
      },
    ],
    rawOutput: input.stdout,
    stderr: input.stderr,
    exitCode: input.exitCode,
    durationMs: input.durationMs,
  };
}

function parseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

