#!/usr/bin/env node

/**
 * Copy VSCode assets to public directory for static serving
 * This script runs during postinstall to ensure all VSCode assets
 * are available in the public directory for better caching
 */

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = join(__dirname, "../../..");
const webDir = join(__dirname, "..");
const publicVscodeDir = join(webDir, "public/vscode");

const EXTENSIONS = [
  {
    name: "fsrelay",
    sourcePath: join(rootDir, "packages/fsrelay"),
  },
];

console.log("📦 Copying VSCode assets to public directory...");

try {
  // 1. Copy vscode-web dist to public/vscode/assets
  const assetsDir = join(publicVscodeDir, "assets");
  if (existsSync(assetsDir)) {
    console.log("🧹 Cleaning existing assets directory...");
    rmSync(assetsDir, { recursive: true, force: true });
  }

  const vscodeWebDist = join(rootDir, "node_modules/vscode-web/dist");
  if (existsSync(vscodeWebDist)) {
    console.log("📋 Copying vscode-web assets...");
    mkdirSync(assetsDir, { recursive: true });
    cpSync(vscodeWebDist, assetsDir, { recursive: true });
  } else {
    console.warn("⚠️  vscode-web not found, skipping...");
  }

  // 2. Copy extensions to assets/extensions (where VSCode expects them)
  const extensionsDir = join(publicVscodeDir, "assets/extensions");
  mkdirSync(extensionsDir, { recursive: true });

  const copiedExtensions = [];

  for (const extension of EXTENSIONS) {
    const targetPath = join(extensionsDir, extension.name);
    if (existsSync(targetPath)) {
      rmSync(targetPath, { recursive: true, force: true });
    }

    if (existsSync(extension.sourcePath)) {
      console.log(`📋 Copying ${extension.name} extension...`);
      cpSync(extension.sourcePath, targetPath, {
        recursive: true,
        filter: (src) => {
          // Exclude node_modules and source files, only copy dist and metadata
          const relativePath = src.replace(extension.sourcePath, "");
          return (
            !relativePath.includes("node_modules") &&
            !relativePath.includes("src") &&
            !relativePath.includes("ui") &&
            !relativePath.includes(".gitignore")
          );
        },
      });
      copiedExtensions.push(extension.name);
    } else {
      console.warn(
        `⚠️  ${extension.name} extension not found at ${extension.sourcePath}, skipping...`,
      );
    }
  }

  // Generate extensions.json
  const extensionsJsonPath = join(publicVscodeDir, "extensions.json");
  writeFileSync(extensionsJsonPath, JSON.stringify(copiedExtensions, null, 2));
  console.log(
    `📄 Generated extensions.json with ${copiedExtensions.length} extensions`,
  );

  console.log("✅ VSCode assets copied successfully!");
} catch (error) {
  console.error("❌ Error copying VSCode assets:", error);
  process.exit(1);
}
