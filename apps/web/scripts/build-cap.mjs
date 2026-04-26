#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const stash = path.join(root, ".cap-stash");

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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://learn.tutly.in";

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
