import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Command, flags } from "@oclif/command";

import { createAPIClient } from "../lib/api/client";
import { isAuthenticated } from "../lib/auth/device";

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

    this.log(`\n📦 Fetching assignment workspace for: ${assignmentId}...`);

    try {
      const api = await createAPIClient();

      // 1. Initialize/Get Submission Repo URL
      this.log("  • Initializing workspace...");
      const repoInfo = await api.createSubmissionRepo(assignmentId);

      if (!repoInfo.repoUrl) {
        this.log("\n❌ Failed to initialize workspace.");
        this.exit(1);
      }

      // 2. Determine Output Directory
      // We need to fetch assignment details to get the title for the directory name
      const details = await api.getAssignmentDetailsForSubmission(assignmentId);
      const assignmentTitle =
        details.assignment?.title || `assignment-${assignmentId}`;

      const outputDir = flags.output || `./${assignmentId}`;

      this.log(`  • Downloading files to: ${outputDir}`);

      // 3. Download Archive
      const cleanRepoUrl = repoInfo.repoUrl.replace(/\.git$/, "");
      const archiveUrl = `${cleanRepoUrl}/archive/main.zip`;

      await api.downloadAndExtractArchive(archiveUrl, outputDir);

      // 4. Create .tutly.json metadata
      const metadata = {
        assignmentId: assignmentId,
        title: assignmentTitle,
        courseId: details.assignment?.class?.courseId,
        clonedAt: new Date().toISOString(),
      };

      await writeFile(
        join(outputDir, ".tutly.json"),
        JSON.stringify(metadata, null, 2),
      );
      this.log(`  ✓ Created: .tutly.json`);

      this.log("\n✨ Assignment workspace ready!");
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
        `\n❌ Failed to setup assignment: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      if (error instanceof Error && error.stack) {
        this.log(`\n${error.stack}`);
      }
      this.exit(1);
    }
  }
}
