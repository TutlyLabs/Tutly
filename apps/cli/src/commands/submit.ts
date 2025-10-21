import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { Command, flags } from "@oclif/command";

import { createAPIClient } from "../lib/api/client";
import { isAuthenticated } from "../lib/auth/device";

export default class Submit extends Command {
  static description = "Submit your work";

  static examples = [
    "<%= config.bin %> <%= command.id %>",
    "<%= config.bin %> <%= command.id %> --dir ./my-assignment",
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

      this.log(`\n📤 Preparing submission for: ${metadata.title}...`);

      // Collect all files
      const files: Array<{ path: string; content: string }> = [];
      await this.collectFiles(submissionDir, submissionDir, files);

      if (files.length === 0) {
        this.log("❌ No files found to submit.");
        this.exit(1);
      }

      this.log(`📁 Found ${files.length} file(s) to submit`);

      // Get assignment details first
      const api = await createAPIClient();
      this.log(`\n📋 Fetching assignment details...`);

      const assignmentResponse =
        await api.getAssignmentDetailsForSubmission(assignmentId);

      if (assignmentResponse.error || !assignmentResponse.assignment) {
        this.log(`\n❌ ${assignmentResponse.error || "Assignment not found"}`);
        this.exit(1);
      }

      const assignment = assignmentResponse.assignment;
      const mentorDetails = assignmentResponse.mentorDetails;

      if (!mentorDetails?.mentor?.username) {
        this.log("\n❌ No mentor assigned. Please contact your instructor.");
        this.exit(1);
      }

      this.log(`✓ Assignment: ${assignment.title}`);
      this.log(`✓ Mentor: ${mentorDetails.mentor.username}`);

      // Submit to API
      this.log(`\n⬆️  Uploading submission...`);

      const result = await api.createSubmission(
        assignmentId,
        files,
        assignment,
        mentorDetails,
      );

      if (result.error) {
        this.log(`\n❌ Submission failed: ${result.error}\n`);
        this.exit(1);
      }

      if (result.success || result.data) {
        this.log("\n✨ Submission successful!");
        this.log(`✓ Your work has been submitted for review\n`);
        if (result.data?.id) {
          this.log(`📝 Submission ID: ${result.data.id}\n`);
        }
      } else {
        this.log(`\n⚠️  Unexpected response from server\n`);
        this.exit(1);
      }
    } catch (error) {
      this.log(
        `\n❌ Failed to submit: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      if (error instanceof Error && error.stack) {
        this.log(`\n${error.stack}`);
      }
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
