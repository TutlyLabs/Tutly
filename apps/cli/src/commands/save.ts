import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Command, flags } from "@oclif/command";

import { createAPIClient } from "../lib/api/client";
import { createWorkspaceArchive } from "../lib/archive";
import { getCurrentUser, isAuthenticated } from "../lib/auth/device";
import { findAssignmentRoot } from "../lib/utils";

export default class Save extends Command {
  static description = "Save your work to the cloud without submitting";

  static examples = [
    "<%= config.bin %> <%= command.id %>",
    "<%= config.bin %> <%= command.id %> --dir ./my-assignment",
  ];

  static flags = {
    help: flags.help({ char: "h" }),
    dir: flags.string({
      char: "d",
      description: "Directory to save (defaults to current directory)",
      default: ".",
    }),
  };

  async run() {
    const { flags } = await this.parse(Save);

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

      this.log(`\n💾 Saving work for: ${metadata.title}...`);

      const api = await createAPIClient();
      let submissionId = metadata.submissionId as string | undefined;
      if (!submissionId) {
        const started = await api.startWorkspace(assignmentId);
        if (started.error || !started.data?.submission?.id) {
          this.log(
            `\n❌ Save failed: ${started.error ?? "Unable to start workspace"}\n`,
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
        this.log("❌ No files found to save.");
        this.exit(1);
      }

      this.log(
        `📁 Compressed size: ${(zipBuffer.length / 1024).toFixed(2)} KB`,
      );

      this.log(`\n⬆️  Uploading save...`);

      const result = await api.saveWorkspaceSnapshot(submissionId, {
        fileName: "autosave.zip",
        mimeType: "application/zip",
        sizeBytes: zipBuffer.length,
        checksum,
        manifest: {
          assignmentId,
          title: metadata.title,
          savedAt: new Date().toISOString(),
        },
      });

      if (result.error) {
        this.log(`\n❌ Save failed: ${result.error}\n`);
        this.exit(1);
      }

      if (
        result.success &&
        result.data?.uploadUrl &&
        result.data?.artifact?.id
      ) {
        await api.uploadToSignedUrl(result.data.uploadUrl, zipBuffer);
        await api.confirmWorkspaceArtifactUpload(
          result.data.artifact.id,
          checksum,
        );
        this.log("\n✨ Save successful!");
        this.log(`✓ Your work has been saved to the cloud\n`);
      } else {
        this.log(`\n⚠️  Unexpected response from server\n`);
        this.exit(1);
      }
    } catch (error) {
      this.log(
        `\n❌ Failed to save: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      if (error instanceof Error && error.stack) {
        this.log(`\n${error.stack}`);
      }
      this.exit(1);
    }
  }
}
