"use client";

import { useCallback, useEffect, useState } from "react";

import type { RunnerClient, ListEntry } from "./RunnerClient";

interface Props {
  client: RunnerClient;
  activePath: string | null;
  onSelect: (path: string) => void;
}

export default function FileTree({ client, activePath, onSelect }: Props) {
  const [entries, setEntries] = useState<ListEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const e = await client.listFiles("/", 3);
      e.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
        return a.path.localeCompare(b.path);
      });
      setEntries(e);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-semibold uppercase">
            Files
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            ⟳
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto py-1 text-sm">
        {loading && <div className="text-muted-foreground px-3 py-2 text-xs">Loading…</div>}
        {!loading && entries.length === 0 && (
          <div className="text-muted-foreground px-3 py-2 text-xs">
            /workspace is empty
          </div>
        )}
        {entries.map((e) => {
          const depth = e.path.split("/").filter(Boolean).length - 1;
          const isActive = e.path === activePath;
          return (
            <button
              key={e.path}
              type="button"
              onClick={() => {
                if (e.kind === "file") onSelect(e.path);
              }}
              className={`hover:bg-accent/40 flex w-full items-center gap-1 truncate px-3 py-1 text-left text-xs ${
                isActive ? "bg-accent/60 text-foreground" : "text-muted-foreground"
              } ${e.kind !== "file" ? "cursor-default" : ""}`}
              style={{ paddingLeft: 12 + depth * 12 }}
            >
              <span className="opacity-70">{e.kind === "dir" ? "▸" : "·"}</span>
              <span className="truncate">{e.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
