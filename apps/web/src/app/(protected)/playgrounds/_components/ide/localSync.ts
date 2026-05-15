"use client";

// 2-way local folder sync via File System Access API (Chromium only).

import { toast } from "sonner";

import { isLikelyBinary } from "./fileOps";

type FSDirHandle = any;
type FSFileHandle = any;

export function isLocalSyncSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

type SnapshotEntry = { handle: FSFileHandle; mtime: number; size: number };
type Snapshot = Map<string, SnapshotEntry>;

const MAX_FILES = 1500;
const MAX_FILE = 1024 * 1024;
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".turbo",
  ".cache",
  ".vercel",
  ".idea",
  ".vscode",
  ".DS_Store",
]);

async function readDir(
  dir: FSDirHandle,
  base = "",
  acc: Snapshot = new Map(),
): Promise<Snapshot> {
  for await (const [name, entry] of (dir as any).entries()) {
    if (SKIP_DIRS.has(name)) continue;
    const rel = base ? `${base}/${name}` : name;
    if (entry.kind === "directory") {
      await readDir(entry, rel, acc);
    } else if (entry.kind === "file") {
      try {
        const file = await entry.getFile();
        if (file.size > MAX_FILE) continue;
        if (isLikelyBinary(name)) continue;
        acc.set(`/${rel}`, {
          handle: entry,
          mtime: file.lastModified,
          size: file.size,
        });
        if (acc.size > MAX_FILES) return acc;
      } catch {
        // ignore unreadable entries
      }
    }
  }
  return acc;
}

async function readText(handle: FSFileHandle): Promise<string> {
  const file = await handle.getFile();
  return await file.text();
}

async function writeText(
  rootDir: FSDirHandle,
  path: string,
  content: string,
): Promise<FSFileHandle> {
  const parts = path.replace(/^\/+/, "").split("/");
  let dir: FSDirHandle = rootDir;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await (dir as any).getDirectoryHandle(parts[i]!, { create: true });
  }
  const fileName = parts[parts.length - 1]!;
  const handle = await (dir as any).getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
  return handle;
}

async function deleteFile(rootDir: FSDirHandle, path: string): Promise<void> {
  const parts = path.replace(/^\/+/, "").split("/");
  let dir: FSDirHandle = rootDir;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await (dir as any).getDirectoryHandle(parts[i]!);
  }
  await (dir as any).removeEntry(parts[parts.length - 1]!);
}

export type LocalSyncFiles = Record<string, string>;

export type LocalSyncSession = {
  rootName: string;
  files: LocalSyncFiles;
  applyIDEUpdate: (path: string, content: string) => Promise<void>;
  applyIDEDelete: (path: string) => Promise<void>;
  pollDisk: () => Promise<{
    added: Record<string, string>;
    changed: Record<string, string>;
    removed: string[];
  }>;
  dispose: () => void;
};

export async function startLocalSync(): Promise<LocalSyncSession | null> {
  if (!isLocalSyncSupported()) {
    toast.error("Local sync needs Chrome, Edge or Brave.");
    return null;
  }

  let root: FSDirHandle;
  try {
    root = await (window as any).showDirectoryPicker({ mode: "readwrite" });
  } catch (e) {
    return null; // user cancelled
  }

  const perm = await root.queryPermission({ mode: "readwrite" });
  if (perm !== "granted") {
    const next = await root.requestPermission({ mode: "readwrite" });
    if (next !== "granted") {
      toast.error("Permission denied for local folder.");
      return null;
    }
  }

  let snapshot = await readDir(root);
  const initialFiles: LocalSyncFiles = {};
  const initialEntries = Array.from(snapshot.entries());
  for (const [path, entry] of initialEntries) {
    try {
      initialFiles[path] = await readText(entry.handle);
    } catch {
      // ignore
    }
  }

  // Track paths we just wrote ourselves, so polling doesn't echo them back.
  const recentSelfWrites = new Map<string, number>();
  const markSelfWrite = (p: string) => {
    recentSelfWrites.set(p, Date.now());
    // expire after 2s
    setTimeout(() => recentSelfWrites.delete(p), 2000);
  };

  const session: LocalSyncSession = {
    rootName: root.name as string,
    files: initialFiles,
    async applyIDEUpdate(path, content) {
      try {
        const handle = await writeText(root, path, content);
        const file = await handle.getFile();
        snapshot.set(path, {
          handle,
          mtime: file.lastModified,
          size: file.size,
        });
        markSelfWrite(path);
      } catch (err) {
        console.warn("[tutly] sync write failed:", err);
      }
    },
    async applyIDEDelete(path) {
      try {
        await deleteFile(root, path);
        snapshot.delete(path);
        markSelfWrite(path);
      } catch (err) {
        console.warn("[tutly] sync delete failed:", err);
      }
    },
    async pollDisk() {
      const fresh = await readDir(root);
      const added: Record<string, string> = {};
      const changed: Record<string, string> = {};
      const removed: string[] = [];

      const freshEntries = Array.from(fresh.entries());
      for (const [path, info] of freshEntries) {
        if (recentSelfWrites.has(path)) continue;
        const prev = snapshot.get(path);
        if (!prev) {
          try {
            added[path] = await readText(info.handle);
          } catch {}
        } else if (prev.mtime !== info.mtime || prev.size !== info.size) {
          try {
            changed[path] = await readText(info.handle);
          } catch {}
        }
      }
      const snapshotPaths = Array.from(snapshot.keys());
      for (const path of snapshotPaths) {
        if (recentSelfWrites.has(path)) continue;
        if (!fresh.has(path)) removed.push(path);
      }

      snapshot = fresh;
      return { added, changed, removed };
    },
    dispose() {
      // nothing to clean up — handles are GC'd
    },
  };

  return session;
}
