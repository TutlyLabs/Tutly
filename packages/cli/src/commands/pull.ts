import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Command, flags } from "@oclif/command";

import { createAPIClient } from "../lib/api/client";
import { isAuthenticated } from "../lib/auth/device";
import { getProjectConfig } from "../lib/config/project";
import { extractArchive } from "../lib/fs/archive";

export default class Pull extends Command {
  static description = "Download assignments for the linked course";

  static examples = [
    "<%= config.bin %> <%= command.id %>",
    "<%= config.bin %> <%= command.id %> --assignment assignment-slug",
  ];

  static flags = {
    help: flags.help({ char: "h" }),
    assignment: flags.string({
      char: "a",
      description: "Specific assignment slug to pull",
    }),
    force: flags.boolean({
      char: "f",
      description: "Overwrite existing files",
    }),
  };

  async run() {
    const { flags } = await this.parse(Pull);

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

      if (assignments.length === 0) {
        this.log("No assignments found for this course.");
        return;
      }

      // Filter by specific assignment if provided
      const assignmentsToPull = flags.assignment
        ? assignments.filter((a) => a.slug === flags.assignment)
        : assignments;

      if (assignmentsToPull.length === 0) {
        this.log(`Error: Assignment '${flags.assignment}' not found.`);
        this.exit(1);
      }

      // Ensure assignments directory exists
      await mkdir(projectConfig.assignmentsDir, { recursive: true });

      for (const assignment of assignmentsToPull) {
        const { default: ora } = await import("ora");
        const spinner = ora(
          `Downloading assignment: ${assignment.title}`,
        ).start();

        try {
          const assignmentDir = join(
            projectConfig.assignmentsDir,
            assignment.slug,
          );

          // Check if assignment already exists
          const { existsSync } = await import("node:fs");
          if (existsSync(assignmentDir) && !flags.force) {
            spinner.warn(
              `Assignment '${assignment.slug}' already exists. Use --force to overwrite.`,
            );
            continue;
          }

          // Download assignment files
          const archiveBlob = await api.downloadAssignment(assignment.id);
          const archiveBuffer = await archiveBlob.arrayBuffer();
          const archivePath = join(
            projectConfig.assignmentsDir,
            `${assignment.slug}.zip`,
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
          };

          await writeFile(
            join(assignmentDir, ".tutly-assignment.json"),
            JSON.stringify(metadata, null, 2),
          );

          spinner.succeed(`Downloaded: ${assignment.title}`);
        } catch (error) {
          spinner.fail(`Failed to download: ${assignment.title}`);
          this.log(
            `Error downloading assignment ${assignment.slug}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      this.log("Pull completed!");
    } catch (error) {
      this.error(
        `Failed to pull assignments: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
