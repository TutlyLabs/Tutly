import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
import AdmZip from "adm-zip";
import ignore, { Ignore } from "ignore";

export async function createWorkspaceArchive(rootDir: string) {
  const zip = new AdmZip();
  const ig = ignore();
  ig.add([
    ".git",
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".tutly/workspace.json",
    ".DS_Store",
  ]);

  const gitignorePath = join(rootDir, ".gitignore");
  if (existsSync(gitignorePath)) {
    ig.add(await readFile(gitignorePath, "utf-8"));
  }

  await addDirectoryToZip(zip, rootDir, rootDir, ig);
  const buffer = zip.toBuffer();
  return {
    buffer,
    checksum: createHash("sha256").update(buffer).digest("hex"),
  };
}

async function addDirectoryToZip(
  zip: AdmZip,
  baseDir: string,
  currentDir: string,
  ig: Ignore,
) {
  const entries = await readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(currentDir, entry.name);
    const relativePath = relative(baseDir, fullPath);

    if (ig.ignores(relativePath)) continue;

    if (entry.isDirectory()) {
      await addDirectoryToZip(zip, baseDir, fullPath, ig);
    } else if (entry.isFile()) {
      zip.addFile(relativePath, await readFile(fullPath));
    }
  }
}

