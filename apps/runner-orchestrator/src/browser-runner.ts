import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { MappedReport, RunOutcome } from "./report.js";
import type { DriverOutcome } from "./result-mapper.js";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { mapDriverOutcome } from "./result-mapper.js";

function dockerArgs(hostCwd: string, containerName: string): string[] {
  return [
    "run",
    "--rm",
    "--name",
    containerName,
    "--read-only",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=128m",
    `--memory=${env.JOB_MEMORY_MB}m`,
    `--memory-swap=${env.JOB_MEMORY_MB}m`,
    `--cpus=${env.JOB_CPU_LIMIT}`,
    `--pids-limit=${env.JOB_PIDS_LIMIT}`,
    "--security-opt=no-new-privileges",
    "--cap-drop=ALL",
    "-v",
    `${hostCwd}:/work:rw`,
    env.BROWSER_IMAGE,
  ];
}

// Docker bind-mount paths must resolve on the host, not inside the orchestrator container.
function toHostPath(localPath: string): string {
  if (!env.WORK_DIR_HOST || env.WORK_DIR_HOST === env.WORK_DIR) {
    return localPath;
  }
  const rel = path.relative(env.WORK_DIR, localPath);
  return path.join(env.WORK_DIR_HOST, rel);
}

export async function runBrowser(cwd: string): Promise<RunOutcome> {
  const workRoot = path.resolve(env.WORK_DIR);
  const resolvedCwd = path.resolve(cwd);
  if (
    resolvedCwd !== workRoot &&
    !resolvedCwd.startsWith(workRoot + path.sep)
  ) {
    return { kind: "spawn-failed", error: "cwd outside WORK_DIR" };
  }
  if (!env.USE_DOCKER) {
    return {
      kind: "spawn-failed",
      error: "browser runner requires USE_DOCKER=true",
    };
  }
  const resultsPathLocal = path.join(resolvedCwd, "results.json");
  const hostCwd = toHostPath(resolvedCwd);
  const containerName = `tutly-browser-${path.basename(resolvedCwd).replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const cmd = "docker";
  const cmdArgs = dockerArgs(hostCwd, containerName);
  logger.debug({ cmd, cmdArgs, hostCwd }, "spawning browser runner");

  return await new Promise<RunOutcome>((resolve) => {
    const child = spawn(cmd, cmdArgs, {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderrBuf = "";
    let resolved = false;

    const killContainer = async () => {
      await new Promise<void>((done) => {
        const killer = spawn("docker", ["kill", containerName], {
          stdio: "ignore",
        });
        killer.on("exit", () => done());
        killer.on("error", () => done());
        setTimeout(() => done(), 3000);
      });
    };

    const finalize = async (outcome: RunOutcome) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutTimer);
      await killContainer();
      resolve(outcome);
    };

    child.stderr?.on("data", (chunk: Buffer) => {
      stderrBuf += chunk.toString("utf-8");
      if (stderrBuf.length > 8000) stderrBuf = stderrBuf.slice(-8000);
    });

    child.on("error", (err) => {
      finalize({ kind: "spawn-failed", error: err.message });
    });

    child.on("exit", async (code, signal) => {
      if (code === 137) {
        finalize({ kind: "oom", stderrTail: stderrBuf });
        return;
      }
      if (signal === "SIGKILL" && !resolved) {
        finalize({ kind: "timeout", stderrTail: stderrBuf });
        return;
      }
      let report: MappedReport;
      try {
        const raw = await readFile(resultsPathLocal, "utf-8");
        const parsed = JSON.parse(raw) as DriverOutcome;
        report = mapDriverOutcome(parsed);
      } catch (err) {
        logger.warn({ err, stderr: stderrBuf }, "could not read results.json");
        report = {
          status: "ERROR",
          results: [],
          errorMessage:
            stderrBuf.slice(-1000) ||
            `runner exited code=${code ?? "?"} signal=${signal ?? "-"} without results.json`,
          raw: { ok: false, error: "no results.json" },
        };
      }
      finalize({ kind: "completed", report, stderrTail: stderrBuf });
    });

    const timeoutTimer = setTimeout(() => {
      logger.warn({ containerName }, "browser run timed out");
      finalize({ kind: "timeout", stderrTail: stderrBuf });
    }, env.JOB_TIMEOUT_MS);
  });
}
