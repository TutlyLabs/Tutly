import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface ProjectConfig {
  orgId: string;
  courseId: string;
  courseSlug: string;
  assignmentsDir: string;
  apiBaseUrl: string;
  linkedAt: string;
}

const PROJECT_DIR = ".tutly";
const PROJECT_FILE = join(PROJECT_DIR, "project.json");

export async function getProjectConfig(): Promise<ProjectConfig | null> {
  if (!existsSync(PROJECT_FILE)) {
    return null;
  }

  const content = await readFile(PROJECT_FILE, "utf-8");
  return JSON.parse(content);
}

export async function setProjectConfig(config: ProjectConfig): Promise<void> {
  await mkdir(PROJECT_DIR, { recursive: true });
  await writeFile(PROJECT_FILE, JSON.stringify(config, null, 2));
}

export async function isProjectLinked(): Promise<boolean> {
  return existsSync(PROJECT_FILE);
}

export function getProjectPath(): string {
  return PROJECT_DIR;
}
