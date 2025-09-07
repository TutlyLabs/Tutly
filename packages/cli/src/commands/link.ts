import { input, select } from "@inquirer/prompts";
import { Command, flags } from "@oclif/command";

import { createAPIClient } from "../lib/api/client";
import { isAuthenticated } from "../lib/auth/device";
import { isProjectLinked, setProjectConfig } from "../lib/config/project";

export default class Link extends Command {
  static description = "Link current directory to a Tutly course";

  static examples = [
    "<%= config.bin %> <%= command.id %>",
    "<%= config.bin %> <%= command.id %> --org org_123 --course course_456",
  ];

  static flags = {
    help: flags.help({ char: "h" }),
    org: flags.string({ char: "o", description: "Organization ID" }),
    course: flags.string({ char: "c", description: "Course ID" }),
    assignmentsDir: flags.string({
      char: "d",
      description: "Assignments directory",
      default: "assignments",
    }),
  };

  async run() {
    const { flags } = await this.parse(Link);

    try {
      if (!(await isAuthenticated())) {
        this.log("Error: Not authenticated. Run 'tutly login' first.");
        this.exit(1);
      }

      if (await isProjectLinked()) {
        this.log("Warning: This directory is already linked to a course.");
        this.log("Use 'tutly status' to see current link information.");
        return;
      }

      const api = await createAPIClient();
      let orgId = flags.org;
      let courseId = flags.course;

      // Get organization if not provided
      if (!orgId) {
        const orgs = await api.getOrganizations();
        if (orgs.length === 0) {
          this.log(
            "Error: No organizations found. Please contact your administrator.",
          );
          this.exit(1);
        }

        if (orgs.length === 1) {
          orgId = orgs[0].id;
          this.log(`Using organization: ${orgs[0].name}`);
        } else {
          const orgChoices = orgs.map((org) => ({
            name: `${org.name} (${org.slug})`,
            value: org.id,
          }));

          orgId = await select({
            message: "Select organization:",
            choices: orgChoices,
          });
        }
      }

      // Get course if not provided
      if (!courseId) {
        const courses = await api.getCourses(orgId);
        if (courses.length === 0) {
          this.log("Error: No courses found in this organization.");
          this.exit(1);
        }

        if (courses.length === 1) {
          courseId = courses[0].id;
          this.log(`Using course: ${courses[0].title}`);
        } else {
          const courseChoices = courses.map((course) => ({
            name: `${course.title} (${course.slug})`,
            value: course.id,
          }));

          courseId = await select({
            message: "Select course:",
            choices: courseChoices,
          });
        }
      }

      // Get course details
      const course = await api.getCourse(courseId);

      // Get assignments directory
      const assignmentsDir =
        flags.assignmentsDir ||
        (await input({
          message: "Assignments directory:",
          default: "assignments",
        }));

      // Create project config
      const globalConfig = await (
        await import("../lib/config/global")
      ).getGlobalConfig();
      await setProjectConfig({
        orgId,
        courseId,
        courseSlug: course.slug,
        assignmentsDir,
        apiBaseUrl: globalConfig.apiBaseUrl,
        linkedAt: new Date().toISOString(),
      });

      this.log("Successfully linked to course!");
      this.log(`Course: ${course.title}`);
      this.log(`Assignments directory: ${assignmentsDir}`);
      this.log(`Project config: .tutly/project.json`);
    } catch (error) {
      this.error(
        `Failed to link project: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
