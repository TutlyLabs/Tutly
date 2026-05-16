import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { env } from "./env.js";
import { logger } from "./logger.js";

type JestAssertion = {
  ancestorTitles?: string[];
  title?: string;
  fullName?: string;
  status?: string;
  duration?: number | null;
  failureMessages?: string[];
};

type JestTestFile = {
  testFilePath?: string;
  name?: string;
  numFailingTests?: number;
  numPassingTests?: number;
  numPendingTests?: number;
  status?: string;
  assertionResults?: JestAssertion[];
  message?: string;
};

export type ParsedJestReport = {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  testResults: Array<{
    filePath: string;
    title: string;
    fullName: string;
    passed: boolean;
    durationMs: number;
    error?: string;
  }>;
  raw: unknown;
};

export type RunOutcome =
  | {
      kind: "completed";
      exitCode: number | null;
      report: ParsedJestReport | null;
      stderrTail: string;
    }
  | { kind: "timeout"; stderrTail: string }
  | { kind: "oom"; stderrTail: string; vmRss?: number }
  | { kind: "spawn-failed"; error: string };

function jestArgs(): string[] {
  return [
    "--json",
    "--outputFile=/work/report.json",
    "--testTimeout=15000",
    "--maxWorkers=1",
    "--workerIdleMemoryLimit=256MB",
    "--colors=false",
    "--ci",
  ];
}

function jestArgsHost(reportPath: string): string[] {
  return jestArgs().map((arg) =>
    arg === "--outputFile=/work/report.json"
      ? `--outputFile=${reportPath}`
      : arg,
  );
}

function dockerArgs(hostCwd: string, containerName: string): string[] {
  const args = [
    "run",
    "--rm",
    "--name",
    containerName,
    "--network=none",
    "--read-only",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=64m",
    `--memory=${env.JOB_MEMORY_MB}m`,
    `--memory-swap=${env.JOB_MEMORY_MB}m`,
    `--cpus=${env.JOB_CPU_LIMIT}`,
    `--pids-limit=${env.JOB_PIDS_LIMIT}`,
    "--security-opt=no-new-privileges",
    "--cap-drop=ALL",
    "-v",
    `${hostCwd}:/work:rw`,
    env.JEST_IMAGE,
    ...jestArgs(),
  ];
  return args;
}

// Docker bind-mount paths must resolve on the host, not inside the orchestrator container.
function toHostPath(localPath: string): string {
  if (!env.WORK_DIR_HOST || env.WORK_DIR_HOST === env.WORK_DIR) {
    return localPath;
  }
  const rel = path.relative(env.WORK_DIR, localPath);
  return path.join(env.WORK_DIR_HOST, rel);
}

export async function runJest(cwd: string): Promise<RunOutcome> {
  const workRoot = path.resolve(env.WORK_DIR);
  const resolvedCwd = path.resolve(cwd);
  if (
    resolvedCwd !== workRoot &&
    !resolvedCwd.startsWith(workRoot + path.sep)
  ) {
    return { kind: "spawn-failed", error: "cwd outside WORK_DIR" };
  }
  const reportPathLocal = path.join(resolvedCwd, "report.json");
  const useDocker = env.USE_DOCKER;
  const hostCwd = toHostPath(resolvedCwd);
  const containerName = `tutly-jest-${path.basename(resolvedCwd).replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const cmd = useDocker ? "docker" : "node";
  const cmdArgs = useDocker
    ? dockerArgs(hostCwd, containerName)
    : [
        path.join(resolvedCwd, "node_modules", ".bin", "jest"),
        ...jestArgsHost(reportPathLocal),
      ];

  logger.debug({ cmd, cmdArgs, hostCwd, useDocker }, "spawning jest");

  return await new Promise<RunOutcome>((resolve) => {
    const child = spawn(cmd, cmdArgs, {
      cwd: useDocker ? undefined : resolvedCwd,
      detached: !useDocker,
      env: useDocker
        ? process.env
        : {
            ...process.env,
            NODE_OPTIONS: "--max-old-space-size=384",
            CI: "1",
          },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderrBuf = "";
    let resolved = false;

    const killChild = async () => {
      try {
        if (useDocker) {
          await new Promise<void>((done) => {
            const killer = spawn("docker", ["kill", containerName], {
              stdio: "ignore",
            });
            killer.on("exit", () => done());
            killer.on("error", () => done());
            setTimeout(() => done(), 3000);
          });
        } else if (child.pid) {
          try {
            process.kill(-child.pid, "SIGKILL");
          } catch {
            /* group may already be gone */
          }
        }
      } catch {
        /* best-effort */
      }
    };

    const finalize = async (outcome: RunOutcome) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutTimer);
      if (memoryTimer) clearInterval(memoryTimer);
      await killChild();
      if (outcome.kind === "completed") {
        try {
          const raw = await readFile(reportPathLocal, "utf-8");
          const parsed = JSON.parse(raw) as {
            numTotalTests?: number;
            numPassedTests?: number;
            numFailedTests?: number;
            testResults?: JestTestFile[];
          };
          outcome.report = normalizeJestReport(parsed);
        } catch (err) {
          logger.warn({ err }, "could not parse report.json");
        }
      }
      resolve(outcome);
    };

    child.stderr?.on("data", (chunk: Buffer) => {
      stderrBuf += chunk.toString("utf-8");
      if (stderrBuf.length > 8000) stderrBuf = stderrBuf.slice(-8000);
    });

    child.on("error", (err) => {
      finalize({ kind: "spawn-failed", error: err.message });
    });

    child.on("exit", (code, signal) => {
      // Exit 137 from Docker = OOM-killed by cgroup.
      if (useDocker && code === 137) {
        finalize({ kind: "oom", stderrTail: stderrBuf });
        return;
      }
      if (useDocker && signal === "SIGKILL" && !resolved) {
        finalize({ kind: "timeout", stderrTail: stderrBuf });
        return;
      }
      finalize({
        kind: "completed",
        exitCode: code,
        report: null,
        stderrTail: stderrBuf,
      });
    });

    const timeoutTimer = setTimeout(() => {
      logger.warn({ containerName }, "jest run timed out");
      finalize({ kind: "timeout", stderrTail: stderrBuf });
    }, env.JOB_TIMEOUT_MS);

    // Non-Docker mode only: cgroup enforces the cap when Docker is in use.
    const memoryTimer: ReturnType<typeof setInterval> | null = useDocker
      ? null
      : setInterval(async () => {
          if (!child.pid) return;
          try {
            const stat = await readFile(`/proc/${child.pid}/status`, "utf-8");
            const match = /VmRSS:\s+(\d+)\s+kB/.exec(stat);
            if (match) {
              const kb = Number(match[1]);
              const limitKb = env.JOB_MEMORY_MB * 1024;
              if (kb > limitKb) {
                logger.warn(
                  { pid: child.pid, vmRssKb: kb },
                  "exceeded memory limit",
                );
                finalize({ kind: "oom", stderrTail: stderrBuf, vmRss: kb });
              }
            }
          } catch {
            /* /proc may not exist on non-Linux dev; skip */
          }
        }, 2000);
  });
}

function normalizeJestReport(parsed: {
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  testResults?: JestTestFile[];
}): ParsedJestReport {
  const flat: ParsedJestReport["testResults"] = [];
  for (const file of parsed.testResults ?? []) {
    for (const assertion of file.assertionResults ?? []) {
      const title = [...(assertion.ancestorTitles ?? []), assertion.title ?? ""]
        .filter(Boolean)
        .join(" > ");
      flat.push({
        filePath: file.testFilePath ?? file.name ?? "",
        title: assertion.title ?? title,
        fullName: title || assertion.fullName || "",
        passed: assertion.status === "passed",
        durationMs: assertion.duration ?? 0,
        error: assertion.failureMessages?.join("\n"),
      });
    }
  }

  return {
    numTotalTests: parsed.numTotalTests ?? flat.length,
    numPassedTests:
      parsed.numPassedTests ?? flat.filter((t) => t.passed).length,
    numFailedTests:
      parsed.numFailedTests ?? flat.filter((t) => !t.passed).length,
    testResults: flat,
    raw: parsed,
  };
}
