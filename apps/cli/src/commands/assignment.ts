import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Command, flags } from "@oclif/command";

import { createAPIClient } from "../lib/api/client";
import { isAuthenticated } from "../lib/auth/device";

interface SandboxFile {
  code: string;
  hidden?: boolean;
}

interface SandboxTemplate {
  template: string;
  options: Record<string, any>;
  files: Record<string, SandboxFile>;
  customSetup?: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    environment?: string;
  };
}

export default class Assignment extends Command {
  static description = "Clone template files for an assignment";

  static examples = [
    "<%= config.bin %> <%= command.id %> <assignment_id>",
    "npx tutly assignment <assignment_id>",
    "npx tutly assignment <assignment_id> --output .",
    "npx tutly assignment <assignment_id> --output ./my-assignment",
  ];

  static flags = {
    help: flags.help({ char: "h" }),
    output: flags.string({
      char: "o",
      description: "Output directory (creates a new directory by default)",
    }),
  };

  static args = [
    {
      name: "assignmentId",
      description: "Assignment ID to clone template files for",
      required: true,
    },
  ];

  async run() {
    const { flags, args } = await this.parse(Assignment);

    if (!(await isAuthenticated())) {
      this.log("❌ Not authenticated. Run 'tutly login' first.");
      this.exit(1);
    }

    const assignmentId = args.assignmentId;

    this.log(`\n📦 Fetching assignment template for: ${assignmentId}...`);

    try {
      const api = await createAPIClient();
      const response =
        await api.getAssignmentDetailsForSubmission(assignmentId);

      if (response.error || !response.assignment) {
        this.log(`\n❌ ${response.error || "Assignment not found"}`);
        this.exit(1);
      }

      const assignment = response.assignment;
      const mentorDetails = response.mentorDetails;

      this.log(`✓ Assignment found: ${assignment.title}`);

      const outputDir =
        flags.output ||
        (() => {
          const dirName = assignment.title
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");
          return `./${dirName}`;
        })();

      // Decode sandboxTemplate
      let sandboxTemplate: SandboxTemplate | null = null;
      if (assignment.sandboxTemplate) {
        try {
          const templateString =
            typeof assignment.sandboxTemplate === "string"
              ? Buffer.from(assignment.sandboxTemplate, "base64").toString(
                  "utf-8",
                )
              : JSON.stringify(assignment.sandboxTemplate);

          sandboxTemplate = JSON.parse(templateString);
        } catch (error) {
          this.log(
            `⚠️  Warning: Could not parse sandbox template: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      if (!sandboxTemplate || !sandboxTemplate.files) {
        this.log("\n❌ No template files found in assignment.");
        this.exit(1);
      }

      this.log(`📁 Creating files in: ${outputDir}\n`);

      await mkdir(outputDir, { recursive: true });

      const fileEntries = Object.entries(sandboxTemplate.files);
      for (const [filePath, fileData] of fileEntries) {
        // Skip hidden files unless explicitly shown
        if (fileData.hidden) {
          continue;
        }

        // Remove leading slash for file path
        const cleanPath = filePath.startsWith("/")
          ? filePath.substring(1)
          : filePath;
        const fullPath = join(outputDir, cleanPath);
        const fileDir = join(fullPath, "..");

        await mkdir(fileDir, { recursive: true });

        await writeFile(fullPath, fileData.code);
        this.log(`  ✓ Created: ${cleanPath}`);
      }

      // Create package.json if dependencies exist
      if (sandboxTemplate.customSetup) {
        const packageJson = {
          name: assignment.title
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, ""),
          version: "1.0.0",
          private: true,
          dependencies: sandboxTemplate.customSetup.dependencies || {},
          devDependencies: sandboxTemplate.customSetup.devDependencies || {},
          ...(sandboxTemplate.customSetup.environment && {
            scripts: {
              start:
                sandboxTemplate.customSetup.environment === "parcel"
                  ? "parcel index.html"
                  : "node index.js",
            },
          }),
        };

        await writeFile(
          join(outputDir, "package.json"),
          JSON.stringify(packageJson, null, 2),
        );
        this.log(`  ✓ Created: package.json`);
      }

      // Create a metadata file for CLI tracking
      const metadata = {
        assignmentId: assignment.id,
        title: assignment.title,
        details: assignment.details,
        maxSubmissions: assignment.maxSubmissions,
        courseId: assignment.class?.courseId,
        mentorUsername: mentorDetails?.mentor?.username,
        clonedAt: new Date().toISOString(),
      };

      await writeFile(
        join(outputDir, ".tutly.json"),
        JSON.stringify(metadata, null, 2),
      );
      this.log(`  ✓ Created: .tutly.json`);

      this.log("\n✨ Assignment files cloned successfully!");
      this.log(`\n📝 Next steps:`);
      if (outputDir !== ".") {
        this.log(`   1. cd ${outputDir}`);
      }
      this.log(
        `   ${outputDir !== "." ? "2" : "1"}. Install dependencies (if any): npm install`,
      );
      this.log(
        `   ${outputDir !== "." ? "3" : "2"}. Start working on your assignment`,
      );
      this.log(
        `   ${outputDir !== "." ? "4" : "3"}. Use 'tutly submit' when ready to submit\n`,
      );
    } catch (error) {
      this.log(
        `\n❌ Failed to clone assignment: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      if (error instanceof Error && error.stack) {
        this.log(`\n${error.stack}`);
      }
      this.exit(1);
    }
  }
}
