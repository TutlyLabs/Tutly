import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Command, flags } from "@oclif/command";

import { createAPIClient } from "../lib/api/client";
import { createWorkspaceArchive } from "../lib/archive";
import { getCurrentUser, isAuthenticated } from "../lib/auth/device";
import { findAssignmentRoot } from "../lib/utils";

export default class Submit extends Command {
  static description = "Submit your work";

  static examples = [
    "<%= config.bin %> <%= command.id %>",
    "<%= config.bin %> <%= command.id %> --dir ./my-assignment",
  ];

  static flags = {
    help: flags.help({ char: "h" }),
    dir: flags.string({
      char: "d",
      description: "Directory to submit (defaults to current directory)",
      default: ".",
    }),
  };

  async run() {
    const { flags } = await this.parse(Submit);

    if (!(await isAuthenticated())) {
      this.log("❌ Not authenticated. Run 'tutly login' first.");
      this.exit(1);
    }

    const startDir = flags.dir;
    const submissionDir = findAssignmentRoot(startDir);

    if (!submissionDir) {
      this.log(
        "❌ No .tutly/workspace.json file found in this directory or any parent directories.",
      );
      this.log(
        "Make sure you're in a directory created by 'tutly assignment <id>'",
      );
      this.exit(1);
    }

    const metadataPath = join(submissionDir, ".tutly", "workspace.json");

    try {
      const metadata = JSON.parse(await readFile(metadataPath, "utf-8"));
      const assignmentId = metadata.assignmentId;

      if (!assignmentId) {
        this.log("❌ Invalid .tutly/workspace.json file: missing assignmentId");
        this.exit(1);
      }

      if (metadata.userId) {
        const user = await getCurrentUser();
        if (user && user.id !== metadata.userId) {
          this.log(
            `\n❌ User mismatch: This assignment was cloned by a different user.`,
          );
          this.log(`Expected user ID: ${metadata.userId}, Found: ${user.id}`);
          this.log(`Please clone the assignment again with your own account.`);
          this.exit(1);
        }
      }

      this.log(`\n📤 Preparing submission for: ${metadata.title}...`);

      const api = await createAPIClient();
      let submissionId = metadata.submissionId as string | undefined;
      if (!submissionId) {
        const started = await api.startWorkspace(assignmentId);
        if (started.error || !started.data?.submission?.id) {
          this.log(
            `\n❌ Submission failed: ${started.error ?? "Unable to start workspace"}\n`,
          );
          this.exit(1);
        }
        submissionId = started.data.submission.id;
        metadata.submissionId = submissionId;
        await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      }

      const { buffer: zipBuffer, checksum } =
        await createWorkspaceArchive(submissionDir);

      if (zipBuffer.length === 0 || !submissionId) {
        this.log("❌ No files found to submit.");
        this.exit(1);
      }

      this.log(
        `📁 Compressed size: ${(zipBuffer.length / 1024).toFixed(2)} KB`,
      );

      this.log(`\n⬆️  Uploading submission...`);

      const result = await api.submitWorkspace(
        { assignmentId, submissionId },
        {
          fileName: "submission.zip",
          mimeType: "application/zip",
          sizeBytes: zipBuffer.length,
          checksum,
          manifest: {
            assignmentId,
            title: metadata.title,
            submittedAt: new Date().toISOString(),
          },
        },
      );

      if (result.error) {
        this.log(`\n❌ Submission failed: ${result.error}\n`);
        this.exit(1);
      }

      if (
        result.success &&
        result.data?.upload?.uploadUrl &&
        result.data?.upload?.artifact?.id
      ) {
        await api.uploadToSignedUrl(result.data.upload.uploadUrl, zipBuffer);
        await api.confirmWorkspaceArtifactUpload(
          result.data.upload.artifact.id,
          checksum,
        );
        this.log("\n✨ Submission successful!");
        this.log(`✓ Your work has been submitted for review\n`);
        if (result.data?.submission?.id) {
          this.log(`📝 Submission ID: ${result.data.submission.id}\n`);
        }
        if (result.data?.officialRunQueued) {
          this.log("🧪 Hidden tests were queued on a trusted runner.\n");
        }
      } else {
        this.log(`\n⚠️  Unexpected response from server\n`);
        this.exit(1);
      }
    } catch (error) {
      this.log(
        `\n❌ Failed to submit: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      if (error instanceof Error && error.stack) {
        this.log(`\n${error.stack}`);
      }
      this.exit(1);
    }
  }
}
