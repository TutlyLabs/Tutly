"use client";

import { useSandpack } from "@codesandbox/sandpack-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  isLocalSyncSupported,
  startLocalSync,
  type LocalSyncSession,
} from "./localSync";

type SyncStatus = { kind: "idle" } | { kind: "active"; folderName: string };

const POLL_INTERVAL_MS = 1500;

export function useLocalSync() {
  const { sandpack } = useSandpack();
  const sessionRef = useRef<LocalSyncSession | null>(null);
  const [status, setStatus] = useState<SyncStatus>({ kind: "idle" });
  const lastContents = useRef<Record<string, string>>({});
  const writingFromDisk = useRef(false);

  // Mirror editor edits → disk.
  useEffect(() => {
    if (!sessionRef.current) return;
    const session = sessionRef.current;
    const prev = lastContents.current;
    const cur = sandpack.files;

    for (const [path, file] of Object.entries(cur)) {
      if (file.hidden) continue;
      if (writingFromDisk.current) continue;
      if (prev[path] !== file.code) {
        void session.applyIDEUpdate(path, file.code);
      }
    }
    // Detect deletes.
    for (const path of Object.keys(prev)) {
      if (!cur[path]) void session.applyIDEDelete(path);
    }
    lastContents.current = Object.fromEntries(
      Object.entries(cur).map(([p, f]) => [p, f.code]),
    );
  }, [sandpack.files]);

  // Poll disk for changes.
  useEffect(() => {
    if (status.kind !== "active") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (cancelled || !sessionRef.current) return;
      try {
        const { added, changed, removed } = await sessionRef.current.pollDisk();
        const merged = { ...added, ...changed };
        if (Object.keys(merged).length === 0 && removed.length === 0) {
          // nothing
        } else {
          writingFromDisk.current = true;
          for (const [path, content] of Object.entries(merged)) {
            sandpack.updateFile(path, content);
            lastContents.current[path] = content;
          }
          for (const path of removed) {
            sandpack.deleteFile(path);
            delete lastContents.current[path];
          }
          writingFromDisk.current = false;
        }
      } catch (err) {
        console.warn("[tutly] poll failed:", err);
      }
      if (!cancelled) timer = setTimeout(tick, POLL_INTERVAL_MS);
    };
    timer = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [status, sandpack]);

  const start = async () => {
    if (!isLocalSyncSupported()) {
      toast.error("Local sync needs Chrome, Edge or Brave.");
      return;
    }
    const session = await startLocalSync();
    if (!session) return;

    // Hydrate editor with disk contents first.
    writingFromDisk.current = true;
    // Wipe non-package.json files; keep package.json for templates that need it.
    for (const path of Object.keys(sandpack.files)) {
      if (path === "/package.json") continue;
      sandpack.deleteFile(path);
    }
    for (const [path, content] of Object.entries(session.files)) {
      sandpack.updateFile(path, content);
    }
    lastContents.current = { ...session.files };
    writingFromDisk.current = false;

    sessionRef.current = session;
    setStatus({ kind: "active", folderName: session.rootName });
    toast.success(`Synced with ${session.rootName}`);
  };

  const stop = () => {
    if (sessionRef.current) {
      sessionRef.current.dispose();
      sessionRef.current = null;
    }
    setStatus({ kind: "idle" });
  };

  return { status, start, stop, supported: isLocalSyncSupported() };
}
