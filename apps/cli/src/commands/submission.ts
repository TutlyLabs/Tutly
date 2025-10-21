import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Command, flags } from "@oclif/command";

import { createAPIClient } from "../lib/api/client";
import { isAuthenticated } from "../lib/auth/device";

export default class Submission extends Command {
  static description = "Clone template files for a submission";

  static examples = [
    "<%= config.bin %> <%= command.id %> submission_123",
    "npx tutly submission submission_123",
  ];

  static flags = {
    help: flags.help({ char: "h" }),
    output: flags.string({
      char: "o",
      description: "Output directory (defaults to current directory)",
      default: ".",
    }),
  };

  static args = [
    {
      name: "submissionId",
      description: "Submission ID to clone template files for",
      required: true,
    },
  ];

  async run() {
    const { flags, args } = await this.parse(Submission);

    if (!(await isAuthenticated())) {
      this.log("❌ Not authenticated. Run 'tutly login' first.");
      this.exit(1);
    }

    const submissionId = args.submissionId;
    const outputDir = flags.output;

    this.log(`\n📦 Fetching submission template for: ${submissionId}...`);

    try {
      const api = await createAPIClient();
      const template = await api.getSubmissionTemplate(submissionId);

      this.log(`✓ Template found: ${template.title}`);
      this.log(`📁 Creating files in: ${outputDir}\n`);

      // Create output directory
      await mkdir(outputDir, { recursive: true });

      // Create template files
      for (const file of template.files) {
        const filePath = join(outputDir, file.path);
        const fileDir = join(filePath, "..");

        // Ensure directory exists
        await mkdir(fileDir, { recursive: true });

        // Write file
        await writeFile(filePath, file.content);
        this.log(`  ✓ Created: ${file.path}`);
      }

      // Create a metadata file
      const metadata = {
        submissionId: template.id,
        assignmentId: template.assignmentId,
        title: template.title,
        description: template.description,
        clonedAt: new Date().toISOString(),
      };

      await writeFile(
        join(outputDir, ".tutly.json"),
        JSON.stringify(metadata, null, 2),
      );

      this.log("\n✨ Template files cloned successfully!");
      this.log(`\n📝 Next steps:`);
      this.log(`   1. cd ${outputDir === "." ? "<directory>" : outputDir}`);
      this.log(`   2. Start working on your submission`);
      this.log(`   3. Use 'tutly submit' when ready to submit\n`);
    } catch (error) {
      this.log(
        `\n❌ Failed to clone template: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      this.exit(1);
    }
  }
}
