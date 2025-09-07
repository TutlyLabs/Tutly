import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Command, flags } from "@oclif/command";

import { isAuthenticated } from "../lib/auth/device";
import { getProjectConfig } from "../lib/config/project";

export default class Status extends Command {
  static description = "Show project status and assignment information";

  static examples = ["<%= config.bin %> <%= command.id %>"];

  static flags = {
    help: flags.help({ char: "h" }),
    json: flags.boolean({ char: "j", description: "Output as JSON" }),
  };

  async run() {
    const { flags } = await this.parse(Status);

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

      // Get local assignments
      const { existsSync } = await import("node:fs");
      const assignmentsDir = projectConfig.assignmentsDir;

      if (!existsSync(assignmentsDir)) {
        this.log(
          "No assignments directory found. Run 'tutly pull' to download assignments.",
        );
        return;
      }

      const assignmentDirs = await readdir(assignmentsDir, {
        withFileTypes: true,
      }).then((dirents) =>
        dirents
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name),
      );

      const assignments = [];
      for (const assignmentSlug of assignmentDirs) {
        const metadataPath = join(
          assignmentsDir,
          assignmentSlug,
          ".tutly-assignment.json",
        );
        if (existsSync(metadataPath)) {
          const metadata = JSON.parse(await readFile(metadataPath, "utf-8"));
          assignments.push(metadata);
        }
      }

      const status = {
        project: {
          orgId: projectConfig.orgId,
          courseId: projectConfig.courseId,
          courseSlug: projectConfig.courseSlug,
          assignmentsDir: projectConfig.assignmentsDir,
          linkedAt: projectConfig.linkedAt,
        },
        assignments: {
          total: assignments.length,
          list: assignments.map((a) => ({
            slug: a.slug,
            title: a.title,
            downloadedAt: a.downloadedAt,
            version: a.version,
          })),
        },
      };

      if (flags.json) {
        this.log(JSON.stringify(status, null, 2));
      } else {
        this.log("Project Status");
        this.log("==============");
        this.log(`Organization: ${projectConfig.orgId}`);
        this.log(
          `Course: ${projectConfig.courseSlug} (${projectConfig.courseId})`,
        );
        this.log(`Assignments Directory: ${projectConfig.assignmentsDir}`);
        this.log(
          `Linked: ${new Date(projectConfig.linkedAt).toLocaleString()}`,
        );
        this.log("");

        if (assignments.length === 0) {
          this.log(
            "No assignments downloaded. Run 'tutly pull' to download assignments.",
          );
        } else {
          this.log(`Assignments (${assignments.length}):`);
          assignments.forEach((assignment) => {
            this.log(`  • ${assignment.title} (${assignment.slug})`);
            this.log(
              `    Downloaded: ${new Date(assignment.downloadedAt).toLocaleString()}`,
            );
            this.log(`    Version: ${assignment.version}`);
            this.log("");
          });
        }
      }
    } catch (error) {
      this.error(
        `Failed to get project status: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
