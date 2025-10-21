import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { Command, flags } from "@oclif/command";

import { createAPIClient } from "../lib/api/client";
import { isAuthenticated } from "../lib/auth/device";

export default class Submit extends Command {
  static description = "Submit your work";

  static examples = [
    "<%= config.bin %> <%= command.id %>",
    "<%= config.bin %> <%= command.id %> --dir ./my-submission",
  ];

  static flags = {
    help: flags.help({ char: "h" }),
    dir: flags.string({
      char: "d",
      description: "Directory to submit (defaults to current directory)",
      default: ".",
    }),
  };

  async run() {
    const { flags } = await this.parse(Submit);

    if (!(await isAuthenticated())) {
      this.log("❌ Not authenticated. Run 'tutly login' first.");
      this.exit(1);
    }

    const submissionDir = flags.dir;

    // Check for .tutly.json metadata file
    const metadataPath = join(submissionDir, ".tutly.json");
    if (!existsSync(metadataPath)) {
      this.log("❌ No .tutly.json file found.");
      this.log("Make sure you're in a directory created by 'tutly submission'");
      this.exit(1);
    }

    try {
      const metadata = JSON.parse(await readFile(metadataPath, "utf-8"));
      const submissionId = metadata.submissionId;

      this.log(`\n📤 Preparing submission for: ${metadata.title}...`);

      // Collect all files
      const files: Array<{ path: string; content: string }> = [];
      await this.collectFiles(submissionDir, submissionDir, files);

      if (files.length === 0) {
        this.log("❌ No files found to submit.");
        this.exit(1);
      }

      this.log(`📁 Found ${files.length} file(s) to submit`);

      // Submit to API
      const api = await createAPIClient();
      this.log(`\n⬆️  Uploading...`);

      const result = await api.submitWork(submissionId, files);

      if (result.success) {
        this.log("\n✨ Submission successful!");
        this.log(`✓ ${result.message}\n`);
      } else {
        this.log(`\n❌ Submission failed: ${result.message}\n`);
        this.exit(1);
      }
    } catch (error) {
      this.log(
        `\n❌ Failed to submit: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      this.exit(1);
    }
  }

  private async collectFiles(
    baseDir: string,
    currentDir: string,
    files: Array<{ path: string; content: string }>,
  ): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      const relativePath = relative(baseDir, fullPath);

      // Skip hidden files and directories, node_modules, etc.
      if (
        entry.name.startsWith(".") ||
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === "build"
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.collectFiles(baseDir, fullPath, files);
      } else if (entry.isFile()) {
        const content = await readFile(fullPath, "utf-8");
        files.push({ path: relativePath, content });
      }
    }
  }
}
