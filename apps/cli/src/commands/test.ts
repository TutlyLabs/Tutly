import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Command, flags } from "@oclif/command";

import { createAPIClient } from "../lib/api/client";
import { getCurrentUser, isAuthenticated } from "../lib/auth/device";
import { runVisibleTestCommand } from "../lib/test-runner";
import { findAssignmentRoot } from "../lib/utils";
import { readTutlyConfig } from "../lib/workspace-config";

export default class Test extends Command {
  static description = "Run visible assignment tests and report the score";

  static flags = {
    help: flags.help({ char: "h" }),
    dir: flags.string({
      char: "d",
      description: "Directory to test (defaults to current directory)",
      default: ".",
    }),
    command: flags.string({
      char: "c",
      description: "Override .tutly/config.yaml test.command",
    }),
    "no-report": flags.boolean({
      description: "Run locally without reporting results to Tutly",
      default: false,
    }),
  };

  static args = [];

  async run() {
    const { flags } = await this.parse(Test);
    const rootDir = findAssignmentRoot(flags.dir);
    if (!rootDir) {
      this.log(
        "❌ No .tutly/workspace.json found. Run this inside an assignment workspace.",
      );
      this.exit(1);
    }

    const metadata = JSON.parse(
      await readFile(join(rootDir, ".tutly", "workspace.json"), "utf-8"),
    );
    const config = await readTutlyConfig(rootDir);
    const command = flags.command ?? config.test?.command ?? "npm test";

    this.log(`🧪 Running visible tests: ${command}`);
    const result = await runVisibleTestCommand({
      command,
      cwd: rootDir,
    });

    if ("error" in result) {
      this.log(`❌ ${result.error}`);
      this.exit(1);
    }

    const passed = result.results.filter(
      (test: { passed: boolean }) => test.passed,
    ).length;
    this.log(`✓ ${passed}/${result.results.length} visible checks passed`);

    if (!flags["no-report"] && metadata.submissionId) {
      if (!(await isAuthenticated())) {
        this.log("⚠️  Not authenticated, skipping score report.");
      } else {
        const user = await getCurrentUser();
        if (!metadata.userId || !user || metadata.userId === user.id) {
          const api = await createAPIClient();
          const report = await api.runVisibleTests(
            metadata.submissionId,
            result.results,
          );
          if (report.error) {
            this.log(`⚠️  Could not report tests: ${report.error}`);
          } else {
            this.log("✓ Visible test score reported to Tutly");
          }
        } else {
          this.log(
            "⚠️  Workspace belongs to a different user, skipping score report.",
          );
        }
      }
    }

    if (!result.ok) this.exit(1);
  }
}
