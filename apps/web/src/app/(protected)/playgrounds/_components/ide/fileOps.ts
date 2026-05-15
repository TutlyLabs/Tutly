"use client";

import { zipSync, strToU8 } from "fflate";

import { toast } from "sonner";

const BINARY_EXTS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
  "ico",
  "pdf",
  "zip",
  "tar",
  "gz",
  "wasm",
  "mp3",
  "mp4",
  "webm",
  "wav",
  "ogg",
  "ttf",
  "otf",
  "woff",
  "woff2",
]);

export function isLikelyBinary(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return BINARY_EXTS.has(ext);
}

export type SandpackFileMap = Record<
  string,
  { code: string; hidden?: boolean; readOnly?: boolean; active?: boolean }
>;

export async function downloadProjectZip(
  files: SandpackFileMap,
  projectName = "tutly-project",
) {
  const entries: Record<string, Uint8Array> = {};
  for (const [rawPath, file] of Object.entries(files)) {
    if (file.hidden) continue;
    const path = rawPath.replace(/^\/+/, "");
    if (!path) continue;
    entries[path] = strToU8(file.code ?? "");
  }
  const readme = `# ${projectName}

This project was exported from Tutly.

## Run locally

If this is a static project:
  npx serve .

If it is a Node/React/Vite project, use the package.json scripts:
  npm install
  npm run dev
`;
  entries["TUTLY-README.md"] = strToU8(readme);

  try {
    const zipped = zipSync(entries, { level: 6 });
    const buffer = new ArrayBuffer(zipped.byteLength);
    new Uint8Array(buffer).set(zipped);
    const blob = new Blob([buffer], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(projectName)}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast.success(`Downloaded ${a.download}`);
  } catch (e) {
    console.error("[tutly] zip failed", e);
    toast.error("Could not create zip. See console.");
  }
}

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "project"
  );
}

export type ImportFile = {
  path: string;
  text: string;
};

const MAX_FILE_SIZE = 1024 * 1024;
const MAX_FILES = 500;

export async function readFilesForImport(
  fileList: FileList | File[],
  baseFolder = "",
): Promise<{
  files: ImportFile[];
  skipped: { path: string; reason: string }[];
}> {
  const arr: File[] = Array.from(fileList);
  const files: ImportFile[] = [];
  const skipped: { path: string; reason: string }[] = [];

  if (arr.length > MAX_FILES) {
    toast.error(`Too many files (${arr.length}). Limit is ${MAX_FILES}.`);
    return { files, skipped };
  }

  const base = baseFolder.replace(/^\/+|\/+$/g, "");

  for (const f of arr) {
    const rel =
      (f as File & { webkitRelativePath?: string }).webkitRelativePath ||
      f.name;
    const cleanRel = rel.replace(/^\/+/, "");
    const path = "/" + (base ? `${base}/${cleanRel}` : cleanRel);

    if (f.size > MAX_FILE_SIZE) {
      skipped.push({ path, reason: `too large (${formatSize(f.size)})` });
      continue;
    }
    if (isLikelyBinary(f.name)) {
      skipped.push({ path, reason: "binary file (not supported yet)" });
      continue;
    }

    try {
      const text = await f.text();
      files.push({ path, text });
    } catch (err) {
      skipped.push({ path, reason: "read failed" });
    }
  }

  return { files, skipped };
}

function formatSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
