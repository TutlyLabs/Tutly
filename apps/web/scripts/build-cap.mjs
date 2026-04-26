#!/usr/bin/env node
// Builds the Capacitor static export. Two kinds of files are moved aside:
//  - src/app/api/* (server-only handlers; mobile calls them remotely)
//  - dynamic [id] route segments (static export can't handle runtime params)
// Both are restored when the build finishes (success or failure).

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const stash = path.join(root, ".cap-stash");

// Folders moved aside before the cap build. Add new dynamic [id] routes here.
const STASH_PATHS = ["src/app/api"];

const moves = [];
function stashFolder(rel) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) return;
  const safe = rel.replace(/[\/\[\]]/g, "_");
  const bak = path.join(stash, safe);
  fs.mkdirSync(stash, { recursive: true });
  fs.renameSync(src, bak);
  moves.push({ src, bak });
}
function restoreAll() {
  for (const { src, bak } of moves.reverse()) {
    if (fs.existsSync(bak)) fs.renameSync(bak, src);
  }
  if (fs.existsSync(stash) && fs.readdirSync(stash).length === 0) {
    fs.rmdirSync(stash);
  }
}

if (fs.existsSync(stash)) {
  console.error(`stale ${stash} — refusing to clobber`);
  process.exit(1);
}

try {
  for (const p of STASH_PATHS) stashFolder(p);
  // Static bundle origin (capacitor://localhost / static host) is not the API
  // origin. Pass NEXT_PUBLIC_API_URL through so the bundled tRPC + auth client
  // know where to call. Defaults to production; override per-environment.
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "https://learn.tutly.in";

  execSync("next build --webpack", {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_BUILD_TARGET: "capacitor",
      NEXT_PUBLIC_API_URL: apiUrl,
    },
  });
} finally {
  restoreAll();
}
