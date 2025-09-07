import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Command, flags } from "@oclif/command";

import { createAPIClient } from "../lib/api/client";
import { isAuthenticated } from "../lib/auth/device";
import { getProjectConfig } from "../lib/config/project";
import {
  createArchive,
  getFilesToArchive,
  readIgnoreFile,
} from "../lib/fs/archive";

export default class Push extends Command {
  static description = "Upload assignment changes to Tutly";

  static examples = [
    "<%= config.bin %> <%= command.id %>",
    "<%= config.bin %> <%= command.id %> assignment-slug",
  ];

  static flags = {
    help: flags.help({ char: "h" }),
    message: flags.string({ char: "m", description: "Commit message" }),
    dryRun: flags.boolean({
      char: "d",
      description: "Show what would be uploaded without actually uploading",
    }),
  };

  static args = [
    {
      name: "assignment",
      description: "Assignment slug to push",
      required: false,
    },
  ];

  async run() {
    const { flags, args } = await this.parse(Push);

    try {
      if (!(await isAuthenticated())) {
        this.log("Error: Not authenticated. Run 'tutly login' first.");
        this.exit(1);
      }

      const projectConfig = await getProjectConfig();
      if (!projectConfig) {
        this.log("Error: No project linked. Run 'tutly link' first.");
        this.exit(1);
      }

      const api = await createAPIClient();
      const assignments = await api.getAssignments(projectConfig.courseId);

      // Determine which assignments to push
      const assignmentArg = args[0];
      const assignmentsToPush = assignmentArg
        ? assignments.filter((a) => a.slug === assignmentArg)
        : assignments;

      if (assignmentsToPush.length === 0) {
        this.log(
          `Error: No assignments found${assignmentArg ? ` matching '${assignmentArg}'` : ""}.`,
        );
        this.exit(1);
      }

      for (const assignment of assignmentsToPush) {
        const assignmentDir = join(
          projectConfig.assignmentsDir,
          assignment.slug,
        );
        const { existsSync } = await import("node:fs");

        if (!existsSync(assignmentDir)) {
          this.log(
            `Warning: Assignment '${assignment.slug}' not found locally. Run 'tutly pull' first.`,
          );
          continue;
        }

        const { default: ora } = await import("ora");
        const spinner = ora(
          `Preparing assignment: ${assignment.title}`,
        ).start();

        try {
          // Read ignore patterns
          const ignorePatterns = await readIgnoreFile(
            join(projectConfig.assignmentsDir, ".tutlyignore"),
          );

          // Get files to archive
          const filesToArchive = await getFilesToArchive(
            assignmentDir,
            ignorePatterns,
          );

          if (filesToArchive.length === 0) {
            spinner.warn(
              `No files to upload for assignment '${assignment.slug}'`,
            );
            continue;
          }

          if (flags.dryRun) {
            spinner.succeed(
              `Would upload ${filesToArchive.length} files for: ${assignment.title}`,
            );
            this.log("Files to upload:");
            filesToArchive.forEach((file) => this.log(`  - ${file}`));
            continue;
          }

          // Create archive
          const archivePath = join(
            projectConfig.assignmentsDir,
            `${assignment.slug}-${Date.now()}.zip`,
          );
          await createArchive(assignmentDir, archivePath, {
            ignorePatterns,
            excludeHidden: true,
          });

          // Get upload URL
          const { uploadUrl } = await api.getUploadUrl(assignment.id);

          // Upload archive
          const archiveBuffer = await readFile(archivePath);
          const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            body: archiveBuffer,
            headers: {
              "Content-Type": "application/zip",
            },
          });

          if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
          }

          // Submit assignment
          const commitMessage =
            flags.message ||
            `Update ${assignment.slug} - ${new Date().toISOString()}`;
          const result = await api.submitAssignment(assignment.id, uploadUrl, {
            commitMessage,
            filesCount: filesToArchive.length,
            submittedAt: new Date().toISOString(),
          });

          // Clean up archive
          const { unlink } = await import("node:fs/promises");
          await unlink(archivePath);

          spinner.succeed(
            `Uploaded: ${assignment.title} (${result.submissionId})`,
          );
        } catch (error) {
          spinner.fail(`Failed to upload: ${assignment.title}`);
          this.log(
            `Error uploading assignment ${assignment.slug}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      this.log("Push completed!");
    } catch (error) {
      this.error(
        `Failed to push assignments: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
