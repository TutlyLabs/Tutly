#!/usr/bin/env node

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const webDir = join(__dirname, "..");
const monorepoRoot = join(webDir, "../..");
const repoParent = join(monorepoRoot, "..");

const sourceWww = join(repoParent, "codesandbox-client/www");
const targetDir = join(webDir, "public/sandpack");

if (!existsSync(sourceWww)) {
  console.log("ℹ️  Sandpack bundler not found locally. Skipping copy.");
  process.exit(0);
}

console.log("📦 Copying Sandpack bundler to public/sandpack...");

try {
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }
  mkdirSync(targetDir, { recursive: true });
  cpSync(sourceWww, targetDir, { recursive: true });

  const targetSize = du(targetDir);
  console.log(`✅ Copied Sandpack bundler (${formatBytes(targetSize)}).`);
} catch (err) {
  console.error("❌ Failed to copy Sandpack bundler:", err.message);
  process.exit(1);
}

function du(p) {
  const s = statSync(p);
  if (!s.isDirectory()) return s.size;
  let total = 0;
  for (const f of readdirSync(p)) {
    total += du(join(p, f));
  }
  return total;
}

function formatBytes(n) {
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(1)} ${u[i]}`;
}
