import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Command, flags } from "@oclif/command";

import { createAPIClient } from "../lib/api/client";
import { getCurrentUser, isAuthenticated } from "../lib/auth/device";
import { renderTutlyConfigYaml } from "../lib/workspace-config";

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
      const user = await getCurrentUser();

      this.log(`  • Starting S3-backed workspace...`);
      const workspace = await api.startWorkspace(assignmentId);

      const details = await api.getAssignmentDetailsForSubmission(assignmentId);
      const assignmentTitle =
        details.assignment?.title ?? `assignment-${assignmentId}`;

      const outputDir = flags.output || `./${assignmentId}`;

      this.log(`  • Downloading files to: ${outputDir}`);
      await mkdir(outputDir, { recursive: true });

      const starterArtifacts = workspace.starterArtifacts ?? [];
      const starterArtifact =
        starterArtifacts.find((artifact) => artifact.kind === "STARTER") ??
        starterArtifacts[0];
      if (starterArtifact?.id) {
        const download = await api.getWorkspaceArtifactDownloadUrl(
          starterArtifact.id,
        );
        await api.downloadAndExtractArchive(download.signedUrl, outputDir);
      }

      const absoluteOutputDir = resolve(outputDir);
      const tutlyDir = join(outputDir, ".tutly");
      await mkdir(tutlyDir, { recursive: true });

      const metadata = {
        assignmentId: assignmentId,
        submissionId: workspace.submission.id,
        title: assignmentTitle,
        courseId: details.assignment?.class?.courseId,
        path: absoluteOutputDir,
        clonedAt: new Date().toISOString(),
        userId: user?.id,
        workspaceToken: workspace.workspaceToken,
      };

      await writeFile(
        join(tutlyDir, "workspace.json"),
        JSON.stringify(metadata, null, 2),
      );
      this.log(`  ✓ Created: .tutly/workspace.json`);

      await writeFile(
        join(tutlyDir, "config.yaml"),
        renderTutlyConfigYaml({
          setupCommand: workspace.config?.setupCommand,
          devCommand: workspace.config?.devCommand,
          testCommand: workspace.config?.testCommand,
          previewPorts: workspace.config?.previewPorts,
          readonlyPaths: workspace.config?.readonlyPaths,
        }),
      );
      this.log(`  ✓ Created: .tutly/config.yaml`);

      this.log(`\n✨ Cloned into ${outputDir}`);
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
