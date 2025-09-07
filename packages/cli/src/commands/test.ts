import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Command, flags } from "@oclif/command";

import { isAuthenticated } from "../lib/auth/device";
import { getProjectConfig } from "../lib/config/project";

export default class Test extends Command {
  static description = "Run tests for an assignment";

  static examples = [
    "<%= config.bin %> <%= command.id %> assignment-slug",
    "<%= config.bin %> <%= command.id %> --all",
  ];

  static flags = {
    help: flags.help({ char: "h" }),
    all: flags.boolean({
      char: "a",
      description: "Run tests for all assignments",
    }),
    watch: flags.boolean({ char: "w", description: "Run tests in watch mode" }),
    coverage: flags.boolean({
      char: "c",
      description: "Generate coverage report",
    }),
  };

  static args = [
    {
      name: "assignment",
      description: "Assignment slug to test",
      required: false,
    },
  ];

  async run() {
    const { flags, args } = await this.parse(Test);

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

      const assignmentsDir = projectConfig.assignmentsDir;
      const { existsSync } = await import("node:fs");

      if (!existsSync(assignmentsDir)) {
        this.log(
          "Error: No assignments directory found. Run 'tutly pull' first.",
        );
        this.exit(1);
      }

      // Determine which assignments to test
      let assignmentsToTest: string[] = [];

      if (flags.all) {
        const assignmentDirs = await readdir(assignmentsDir, {
          withFileTypes: true,
        });
        assignmentsToTest = assignmentDirs
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name);
      } else if (args[0]) {
        assignmentsToTest = [args[0]];
      } else {
        this.log("Error: Please specify an assignment or use --all flag.");
        this.exit(1);
      }

      if (assignmentsToTest.length === 0) {
        this.log("No assignments found to test.");
        return;
      }

      // Test each assignment
      for (const assignmentSlug of assignmentsToTest) {
        const assignmentDir = join(assignmentsDir, assignmentSlug);

        if (!existsSync(assignmentDir)) {
          this.log(
            `Warning: Assignment '${assignmentSlug}' not found locally.`,
          );
          continue;
        }

        const { default: ora } = await import("ora");
        const spinner = ora(`Running tests for: ${assignmentSlug}`).start();

        try {
          // Check if assignment has test configuration
          const packageJsonPath = join(assignmentDir, "package.json");
          const vitestConfigPath = join(assignmentDir, "vitest.config.ts");
          const jestConfigPath = join(assignmentDir, "jest.config.js");

          if (!existsSync(packageJsonPath)) {
            spinner.warn(
              `No package.json found for assignment '${assignmentSlug}'`,
            );
            continue;
          }

          const packageJson = JSON.parse(
            await readFile(packageJsonPath, "utf-8"),
          );
          const testScript = packageJson.scripts?.test;

          if (!testScript) {
            spinner.warn(
              `No test script found for assignment '${assignmentSlug}'`,
            );
            continue;
          }

          // Run tests
          const testResult = await this.runTests(assignmentDir, testScript, {
            watch: flags.watch as boolean,
            coverage: flags.coverage as boolean,
          });

          if (testResult.success) {
            spinner.succeed(`Tests passed for: ${assignmentSlug}`);
            if (testResult.output) {
              this.log(testResult.output);
            }
          } else {
            spinner.fail(`Tests failed for: ${assignmentSlug}`);
            if (testResult.output) {
              this.log(testResult.output);
            }
          }
        } catch (error) {
          spinner.fail(`Failed to run tests for: ${assignmentSlug}`);
          this.log(
            `Error running tests for ${assignmentSlug}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }
    } catch (error) {
      this.error(
        `Failed to run tests: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async runTests(
    assignmentDir: string,
    testScript: string,
    options: { watch?: boolean; coverage?: boolean },
  ): Promise<{ success: boolean; output?: string }> {
    return new Promise((resolve) => {
      const args = testScript.split(" ").slice(1); // Remove 'npm' or 'yarn'

      if (options.watch && !args.includes("--watch")) {
        args.push("--watch");
      }

      if (options.coverage && !args.includes("--coverage")) {
        args.push("--coverage");
      }

      const child = spawn("npm", ["test", ...args], {
        cwd: assignmentDir,
        stdio: "pipe",
      });

      let output = "";
      let errorOutput = "";

      child.stdout?.on("data", (data) => {
        output += data.toString();
      });

      child.stderr?.on("data", (data) => {
        errorOutput += data.toString();
      });

      child.on("close", (code) => {
        const fullOutput = output + errorOutput;
        resolve({
          success: code === 0,
          output: fullOutput || undefined,
        });
      });

      child.on("error", (error) => {
        resolve({
          success: false,
          output: error.message,
        });
      });
    });
  }
}
