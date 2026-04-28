import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface TutlyWorkspaceConfig {
  setup?: { command?: string };
  dev?: { command?: string };
  test?: { command?: string };
  preview?: { ports?: number[] };
  readonly?: string[];
  grading?: { visible?: unknown };
}

export async function readTutlyConfig(rootDir: string): Promise<TutlyWorkspaceConfig> {
  const jsonPath = join(rootDir, ".tutly", "config.json");
  if (existsSync(jsonPath)) {
    return JSON.parse(await readFile(jsonPath, "utf-8")) as TutlyWorkspaceConfig;
  }

  const yamlPath = join(rootDir, ".tutly", "config.yaml");
  if (!existsSync(yamlPath)) return {};

  const source = await readFile(yamlPath, "utf-8");
  return parseSimpleTutlyYaml(source);
}

export function parseSimpleTutlyYaml(source: string): TutlyWorkspaceConfig {
  const config: TutlyWorkspaceConfig = {};
  let section = "";

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, "");
    if (!line.trim()) continue;

    const sectionMatch = /^([a-zA-Z0-9_-]+):\s*$/.exec(line);
    if (sectionMatch) {
      section = sectionMatch[1] ?? "";
      continue;
    }

    const commandMatch = /^\s+command:\s*(.+)$/.exec(line);
    if (commandMatch && ["setup", "dev", "test"].includes(section)) {
      const target = (config[section as "setup" | "dev" | "test"] ??= {});
      target.command = stripQuotes(commandMatch[1] ?? "");
      continue;
    }

    const inlinePortsMatch = /^\s+ports:\s*\[(.*)\]\s*$/.exec(line);
    if (inlinePortsMatch && section === "preview") {
      config.preview ??= {};
      config.preview.ports = parsePorts(inlinePortsMatch[1] ?? "");
      continue;
    }

    const portItemMatch = /^\s+-\s*(\d+)\s*$/.exec(line);
    if (portItemMatch && section === "preview") {
      config.preview ??= {};
      config.preview.ports ??= [];
      config.preview.ports.push(Number(portItemMatch[1]));
      continue;
    }

    const readonlyItemMatch = /^\s+-\s*(.+)$/.exec(line);
    if (readonlyItemMatch && section === "readonly") {
      config.readonly ??= [];
      config.readonly.push(stripQuotes(readonlyItemMatch[1] ?? ""));
    }
  }

  return config;
}

export function renderTutlyConfigYaml(input: {
  setupCommand?: string | null;
  devCommand?: string | null;
  testCommand?: string | null;
  previewPorts?: number[];
  readonlyPaths?: string[];
}) {
  const ports = input.previewPorts?.length ? input.previewPorts : [3000, 5173, 4173, 8080];
  const readonly = input.readonlyPaths?.length ? input.readonlyPaths : [".tutly/**"];

  return [
    "version: 1",
    "setup:",
    `  command: ${input.setupCommand ?? "pnpm install"}`,
    "dev:",
    `  command: ${input.devCommand ?? "pnpm dev"}`,
    "test:",
    `  command: ${input.testCommand ?? "pnpm test"}`,
    "preview:",
    "  ports:",
    ...ports.map((port) => `    - ${port}`),
    "readonly:",
    ...readonly.map((pattern) => `  - ${pattern}`),
    "grading:",
    "  visible: true",
    "",
  ].join("\n");
}

function stripQuotes(value: string) {
  const trimmed = value.trim();
  return trimmed.replace(/^['"]|['"]$/g, "");
}

function parsePorts(value: string) {
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((port) => Number.isInteger(port) && port > 0 && port < 65536);
}

