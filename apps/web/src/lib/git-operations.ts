import { env } from "process";
import AdmZip from "adm-zip";
import simpleGit from "simple-git";
import tmp from "tmp";
import { promises as fs } from "fs";
import path from "path";
import yaml from "js-yaml";
import { minimatch } from "minimatch";

const GITEA_API_URL = env.GITEA_API_URL;
const GITEA_ADMIN_TOKEN = env.GITEA_ADMIN_TOKEN;
const GITEA_ADMIN_USER = env.GITEA_ADMIN_USER || "admin";

if (!GITEA_API_URL || !GITEA_ADMIN_TOKEN) {
  console.warn("GITEA_API_URL or GITEA_ADMIN_TOKEN is not set");
}

/**
 * Clears the working directory while preserving the .git folder
 * This ensures that file deletions are properly detected
 */
async function clearWorkingDirectory(workDir: string): Promise<void> {
  const entries = await fs.readdir(workDir);

  for (const entry of entries) {
    // Skip .git directory
    if (entry === ".git") {
      continue;
    }

    const fullPath = path.join(workDir, entry);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      await fs.unlink(fullPath);
    }
  }
}

/**
 * Extracts a zip buffer to the target directory
 */
async function extractZip(zipBuffer: Buffer, targetDir: string): Promise<void> {
  const zip = new AdmZip(zipBuffer);
  zip.extractAllTo(targetDir, true);
}

/**
 * Constructs an authenticated Gitea URL for git operations
 */
function getAuthenticatedGitUrl(owner: string, repo: string): string {
  if (!GITEA_API_URL || !GITEA_ADMIN_TOKEN) {
    throw new Error("GITEA_API_URL or GITEA_ADMIN_TOKEN is not configured");
  }

  // Parse the API URL to get the host
  const url = new URL(GITEA_API_URL);
  const host = url.host; // e.g., "localhost:3000"
  const protocol = url.protocol.replace(":", ""); // e.g., "http"

  // Construct authenticated URL: http://username:token@host/owner/repo.git
  return `${protocol}://${GITEA_ADMIN_USER}:${GITEA_ADMIN_TOKEN}@${host}/${owner}/${repo}.git`;
}

/**
 * Commits and pushes a zip file to a git repository
 */
export async function commitAndPushZip(
  zipBuffer: Buffer,
  owner: string,
  repo: string,
  message: string,
  author: { name: string; email: string },
  options?: { checkReadonly?: boolean },
): Promise<{ success: true; filesProcessed: number }> {
  const tmpDir = tmp.dirSync({ unsafeCleanup: true });
  const workDir = tmpDir.name;

  try {
    const remoteUrl = getAuthenticatedGitUrl(owner, repo);

    // Clone repository
    const git = simpleGit();
    await git.clone(remoteUrl, workDir, ["--depth", "1", "--branch", "main"]);

    // Read config for readonly check BEFORE clearing directory
    let readonlyPatterns: string[] = [];
    if (options?.checkReadonly) {
      try {
        const configPath = path.join(workDir, ".tutly", "config.yaml");
        if (
          await fs
            .stat(configPath)
            .then(() => true)
            .catch(() => false)
        ) {
          const configContent = await fs.readFile(configPath, "utf-8");
          const config = yaml.load(configContent) as any;
          if (config && Array.isArray(config.readonly)) {
            readonlyPatterns = config.readonly;
          }
        }
      } catch (e) {
        console.warn(
          "Failed to read .tutly/config.yaml for readonly check:",
          e,
        );
      }
    }

    // Clear working directory (preserving .git) to detect deletions
    await clearWorkingDirectory(workDir);

    // Extract zip over the cleaned repository
    await extractZip(zipBuffer, workDir);

    const gitRepo = simpleGit(workDir);

    // Configure git author
    await gitRepo.addConfig("user.name", author.name, false, "local");
    await gitRepo.addConfig("user.email", author.email, false, "local");

    // Stage all changes (additions, modifications, deletions)
    await gitRepo.add("-A");

    const status = await gitRepo.status();

    // Check for readonly violations
    if (options?.checkReadonly && readonlyPatterns.length > 0) {
      const changedFiles = [
        ...status.modified,
        ...status.deleted,
        ...status.created,
        ...status.renamed.map((r) => r.to),
      ];

      for (const file of changedFiles) {
        for (const pattern of readonlyPatterns) {
          if (minimatch(file, pattern)) {
            throw new Error(
              `Security Violation: Cannot modify readonly file '${file}' (matches '${pattern}').`,
            );
          }
        }
      }
    }

    if (status.files.length === 0) {
      return { success: true, filesProcessed: 0 };
    }

    await gitRepo.commit(message, {
      "--author": `${author.name} <${author.email}>`,
    });

    await gitRepo.push("origin", "main");

    return {
      success: true,
      filesProcessed: status.files.length,
    };
  } catch (error) {
    console.error("Git operation failed:", error);
    throw new Error(
      `Failed to commit and push: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  } finally {
    try {
      tmpDir.removeCallback();
    } catch (cleanupError) {
      console.warn("Failed to cleanup temporary directory:", cleanupError);
    }
  }
}
