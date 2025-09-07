import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Command, flags } from "@oclif/command";

import { createAPIClient } from "../lib/api/client";
import { isAuthenticated } from "../lib/auth/device";
import { getProjectConfig } from "../lib/config/project";
import { extractArchive } from "../lib/fs/archive";

export default class Reset extends Command {
  static description = "Reset assignment to server version";

  static examples = ["<%= config.bin %> <%= command.id %> assignment-slug"];

  static flags = {
    help: flags.help({ char: "h" }),
    backup: flags.boolean({
      char: "b",
      description: "Create backup before reset",
      default: true,
    }),
  };

  static args = [
    {
      name: "assignment",
      description: "Assignment slug to reset",
      required: true,
    },
  ];

  async run() {
    const { flags, args } = await this.parse(Reset);

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

      const assignmentSlug = args[0];
      const assignmentDir = join(projectConfig.assignmentsDir, assignmentSlug);
      const { existsSync } = await import("node:fs");
      const { rename } = await import("node:fs/promises");

      if (!existsSync(assignmentDir)) {
        this.log(`Error: Assignment '${assignmentSlug}' not found locally.`);
        this.exit(1);
      }

      // Find the assignment ID
      const api = await createAPIClient();
      const assignments = await api.getAssignments(projectConfig.courseId);
      const assignment = assignments.find((a) => a.slug === assignmentSlug);

      if (!assignment) {
        this.log(`Error: Assignment '${assignmentSlug}' not found on server.`);
        this.exit(1);
      }

      const { default: ora } = await import("ora");
      const spinner = ora(`Resetting assignment: ${assignment.title}`).start();

      try {
        // Create backup if requested
        if (flags.backup) {
          const backupDir = join(
            projectConfig.assignmentsDir,
            `${assignmentSlug}.backup.${Date.now()}`,
          );
          await rename(assignmentDir, backupDir);
          spinner.info(`Backup created: ${backupDir}`);
        } else {
          // Remove existing directory
          const { rm } = await import("node:fs/promises");
          await rm(assignmentDir, { recursive: true, force: true });
        }

        // Download fresh assignment
        const archiveBlob = await api.downloadAssignment(assignment.id);
        const archiveBuffer = await archiveBlob.arrayBuffer();
        const archivePath = join(
          projectConfig.assignmentsDir,
          `${assignmentSlug}.zip`,
        );

        await writeFile(archivePath, Buffer.from(archiveBuffer));

        // Extract archive
        await extractArchive(archivePath, assignmentDir);

        // Clean up archive
        const { unlink } = await import("node:fs/promises");
        await unlink(archivePath);

        // Create assignment metadata
        const metadata = {
          id: assignment.id,
          slug: assignment.slug,
          title: assignment.title,
          description: assignment.description,
          downloadedAt: new Date().toISOString(),
          version: "1.0.0",
          resetAt: new Date().toISOString(),
        };

        await writeFile(
          join(assignmentDir, ".tutly-assignment.json"),
          JSON.stringify(metadata, null, 2),
        );

        spinner.succeed(`Reset completed: ${assignment.title}`);
        this.log("Assignment has been reset to server version.");
      } catch (error) {
        spinner.fail(`Failed to reset: ${assignment.title}`);
        this.log(
          `Error resetting assignment ${assignmentSlug}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        this.error("Failed to reset assignment. Please try again.");
      }
    } catch (error) {
      this.error(
        `Failed to reset assignment: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
