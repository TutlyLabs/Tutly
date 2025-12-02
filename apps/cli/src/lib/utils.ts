import { existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

export function findAssignmentRoot(startDir: string): string | null {
  let currentDir = resolve(startDir);
  const root = resolve("/");

  while (true) {
    if (existsSync(join(currentDir, ".tutly.json"))) {
      return currentDir;
    }

    if (currentDir === root) {
      return null;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}
