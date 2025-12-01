import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { Command, flags } from "@oclif/command";
import AdmZip from "adm-zip";
import ignore, { Ignore } from "ignore";

import { createAPIClient } from "../lib/api/client";
import { isAuthenticated } from "../lib/auth/device";

export default class Save extends Command {
  static description = "Save your work to the cloud without submitting";

  static examples = [
    "<%= config.bin %> <%= command.id %>",
    "<%= config.bin %> <%= command.id %> --dir ./my-assignment",
  ];

  static flags = {
    help: flags.help({ char: "h" }),
    dir: flags.string({
      char: "d",
      description: "Directory to save (defaults to current directory)",
      default: ".",
    }),
  };

  async run() {
    const { flags } = await this.parse(Save);

    if (!(await isAuthenticated())) {
      this.log("❌ Not authenticated. Run 'tutly login' first.");
      this.exit(1);
    }

    const submissionDir = flags.dir;

    // Check for .tutly.json metadata file
    const metadataPath = join(submissionDir, ".tutly.json");
    if (!existsSync(metadataPath)) {
      this.log("❌ No .tutly.json file found.");
      this.log(
        "Make sure you're in a directory created by 'tutly assignment <id>'",
      );
      this.exit(1);
    }

    try {
      const metadata = JSON.parse(await readFile(metadataPath, "utf-8"));
      const assignmentId = metadata.assignmentId;

      if (!assignmentId) {
        this.log("❌ Invalid .tutly.json file: missing assignmentId");
        this.exit(1);
      }

      this.log(`\n💾 Saving work for: ${metadata.title}...`);

      // 1. Create Zip Archive
      const zip = new AdmZip();

      // Initialize ignore
      const ig = ignore();
      ig.add([
        ".git",
        "node_modules",
        "dist",
        "build",
        "coverage",
        ".tutly.json",
        ".DS_Store",
      ]);

      const gitignorePath = join(submissionDir, ".gitignore");
      if (existsSync(gitignorePath)) {
        const gitignoreContent = await readFile(gitignorePath, "utf-8");
        ig.add(gitignoreContent);
      }

      // Add files to zip, respecting .gitignore-like rules
      await this.addDirectoryToZip(zip, submissionDir, submissionDir, ig);

      const zipBuffer = zip.toBuffer();

      if (zipBuffer.length === 0) {
        this.log("❌ No files found to save.");
        this.exit(1);
      }

      this.log(
        `📁 Compressed size: ${(zipBuffer.length / 1024).toFixed(2)} KB`,
      );

      // 2. Upload Save
      const api = await createAPIClient();
      this.log(`\n⬆️  Uploading save...`);

      const result = await api.uploadSubmission(
        assignmentId,
        zipBuffer,
        "SAVE",
      );

      if (result.error) {
        this.log(`\n❌ Save failed: ${result.error}\n`);
        this.exit(1);
      }

      if (result.success) {
        this.log("\n✨ Save successful!");
        this.log(`✓ Your work has been saved to the cloud\n`);
      } else {
        this.log(`\n⚠️  Unexpected response from server\n`);
        this.exit(1);
      }
    } catch (error) {
      this.log(
        `\n❌ Failed to save: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      if (error instanceof Error && error.stack) {
        this.log(`\n${error.stack}`);
      }
      this.exit(1);
    }
  }

  private async addDirectoryToZip(
    zip: AdmZip,
    baseDir: string,
    currentDir: string,
    ig: Ignore,
  ) {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      const relativePath = relative(baseDir, fullPath);

      // Check if ignored
      if (ig.ignores(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.addDirectoryToZip(zip, baseDir, fullPath, ig);
      } else if (entry.isFile()) {
        const content = await readFile(fullPath);
        zip.addFile(relativePath, content);
      }
    }
  }
}
