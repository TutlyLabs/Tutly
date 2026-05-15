"use client";

import { Circle, FolderSync, GitBranch, Wifi } from "lucide-react";
import { useMemo } from "react";

import { useFiles } from "./useFiles";
import { useIDE } from "./ideStore";
import { getLanguage } from "./FileIcon";

export default function StatusBar({
  localSyncFolder = null,
}: {
  localSyncFolder?: string | null;
}) {
  const { files } = useFiles();
  const { state } = useIDE();

  const activeTab = useMemo(() => {
    const find = (n: any): any => {
      if (n.type === "pane")
        return n.tabs.find((t: any) => t.id === n.activeTabId);
      for (const c of n.children) {
        const r = find(c);
        if (r) return r;
      }
      return null;
    };
    return find(state.layout);
  }, [state.layout]);

  const language = activeTab ? getLanguage(activeTab.path) : null;
  const code = activeTab ? (files[activeTab.path]?.code ?? "") : "";
  const lines = code ? code.split("\n").length : 0;
  const size = new Blob([code]).size;
  const fileCount = Object.keys(files).filter((p) => !files[p]?.hidden).length;

  return (
    <div className="bg-muted/40 text-muted-foreground flex h-6 shrink-0 items-center gap-3 border-t px-3 text-[11px]">
      <span className="flex items-center gap-1.5">
        <GitBranch className="h-3 w-3" /> main
      </span>
      <span className="flex items-center gap-1.5">
        <Wifi className="h-3 w-3" /> Connected
      </span>
      <span>{fileCount} files</span>
      {localSyncFolder && (
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("tutly:stop-local-sync"))
          }
          className="text-primary hover:text-primary/80 flex items-center gap-1.5"
          title="Click to stop syncing"
        >
          <FolderSync className="h-3 w-3" />
          Synced: {localSyncFolder}
        </button>
      )}
      <span className="ml-auto flex items-center gap-3">
        {activeTab && (
          <>
            <span>{lines} lines</span>
            <span>{formatBytes(size)}</span>
            <span className="text-foreground/80 flex items-center gap-1">
              <Circle className="text-primary h-2 w-2 fill-current" />
              {language?.toUpperCase()}
            </span>
            <span className="hidden sm:inline">UTF-8</span>
          </>
        )}
        <span className="hidden md:inline">Tutly Playgrounds</span>
      </span>
    </div>
  );
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
