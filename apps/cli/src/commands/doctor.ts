import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Command, flags } from "@oclif/command";

import { isAuthenticated } from "../lib/auth/device";
import { findAssignmentRoot } from "../lib/utils";
import { readTutlyConfig } from "../lib/workspace-config";

export default class Doctor extends Command {
  static description =
    "Check local assignment workspace, agent, tests, and preview ports";

  static flags = {
    help: flags.help({ char: "h" }),
    dir: flags.string({
      char: "d",
      description: "Workspace directory (defaults to current directory)",
      default: ".",
    }),
    server: flags.string({
      description: "Local agent URL",
      default: "http://localhost:4242",
    }),
    "api-key": flags.string({
      description: "Local agent API key",
      default: process.env.TUTLY_AGENT_KEY ?? "tutly-dev-key",
    }),
  };

  static args = [];

  async run() {
    const { flags } = await this.parse(Doctor);
    const checks: Array<{ label: string; ok: boolean; detail?: string }> = [];

    checks.push({
      label: "Authentication",
      ok: await isAuthenticated(),
      detail: "Run tutly login if this fails.",
    });

    const rootDir = findAssignmentRoot(flags.dir);
    checks.push({
      label: "Workspace metadata",
      ok: Boolean(rootDir),
      detail: rootDir ?? "No .tutly/workspace.json found.",
    });

    if (rootDir) {
      const metadata = JSON.parse(
        await readFile(join(rootDir, ".tutly", "workspace.json"), "utf-8"),
      );
      const config = await readTutlyConfig(rootDir);
      checks.push({
        label: "Assignment id",
        ok: Boolean(metadata.assignmentId),
        detail: metadata.assignmentId,
      });
      checks.push({
        label: "Submission id",
        ok: Boolean(metadata.submissionId),
        detail: metadata.submissionId ?? "Missing until workspace is started.",
      });
      checks.push({
        label: "Visible test command",
        ok: Boolean(config.test?.command),
        detail: config.test?.command ?? "Using fallback: npm test",
      });
      checks.push({
        label: "Preview ports",
        ok: Boolean(config.preview?.ports?.length),
        detail:
          config.preview?.ports?.join(", ") ?? "Using fallback common ports.",
      });
    }

    try {
      const response = await fetch(`${flags.server}/api/health`, {
        headers: { "x-api-key": flags["api-key"] },
      });
      const body = await response.json().catch(() => null);
      checks.push({
        label: "Local agent",
        ok: response.ok,
        detail: response.ok
          ? body?.directory
          : `${response.status} ${response.statusText}`,
      });
    } catch (error) {
      checks.push({
        label: "Local agent",
        ok: false,
        detail: `Not reachable at ${flags.server}. Run tutly playground.`,
      });
    }

    this.log("\nTutly doctor\n");
    for (const check of checks) {
      this.log(
        `${check.ok ? "✓" : "✗"} ${check.label}${check.detail ? `: ${check.detail}` : ""}`,
      );
    }

    if (checks.some((check) => !check.ok)) this.exit(1);
  }
}
