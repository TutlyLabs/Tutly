import {
  createWriteStream,
  createReadStream as fsCreateReadStream,
} from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import archiver from "archiver";
import { glob } from "fast-glob";
import ignore from "ignore";

export interface ArchiveOptions {
  ignorePatterns?: string[];
  includePatterns?: string[];
  excludeHidden?: boolean;
}

export async function createArchive(
  sourceDir: string,
  outputPath: string,
  options: ArchiveOptions = {},
): Promise<void> {
  const {
    ignorePatterns = [],
    includePatterns = ["**/*"],
    excludeHidden = true,
  } = options;

  // Create ignore instance
  const ig = ignore();
  if (excludeHidden) {
    ig.add([".*", "**/.*"]);
  }
  ig.add(ignorePatterns);

  // Get all files matching include patterns
  const allFiles = await glob(includePatterns, {
    cwd: sourceDir,
    dot: !excludeHidden,
    onlyFiles: true,
  });

  // Filter out ignored files
  const filesToArchive = allFiles.filter((file) => !ig.ignores(file));

  // Create archive
  const output = createWriteStream(outputPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on("close", () => resolve());
    archive.on("error", reject);
    archive.on("warning", (err) => {
      if (err.code === "ENOENT") {
        console.warn("Warning:", err.message);
      } else {
        reject(err);
      }
    });

    archive.pipe(output);

    // Add files to archive
    for (const file of filesToArchive) {
      const filePath = join(sourceDir, file);
      archive.append(fsCreateReadStream(filePath), { name: file });
    }

    archive.finalize();
  });
}

export async function extractArchive(
  archivePath: string,
  targetDir: string,
): Promise<void> {
  // For now, we'll use a simple approach
  // In production, you might want to use a proper zip extraction library
  const AdmZip = require("adm-zip");
  const zip = new AdmZip(archivePath);

  await mkdir(targetDir, { recursive: true });
  zip.extractAllTo(targetDir, true);
}

export async function readIgnoreFile(ignorePath: string): Promise<string[]> {
  try {
    const content = await readFile(ignorePath, "utf-8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  } catch {
    return [];
  }
}

export async function getFilesToArchive(
  sourceDir: string,
  ignorePatterns: string[] = [],
): Promise<string[]> {
  const ig = ignore();
  ig.add(ignorePatterns);

  const allFiles = await glob(["**/*"], {
    cwd: sourceDir,
    dot: false,
    onlyFiles: true,
  });

  return allFiles.filter((file) => !ig.ignores(file));
}
