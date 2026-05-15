"use client";

import { useMemo, useState } from "react";

import { useIDE } from "./ideStore";
import { useFiles } from "./useFiles";
import { getDisplayName } from "./fileMeta";
import { FileIcon } from "./FileIcon";
import { cn } from "@tutly/utils";

type Hit = {
  path: string;
  line: number;
  col: number;
  preview: string;
  matchStart: number;
  matchEnd: number;
};

export default function SearchPanel() {
  const { files } = useFiles();
  const { openFile } = useIDE();
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [] as { path: string; hits: Hit[] }[];
    const q = caseSensitive ? query : query.toLowerCase();
    const groups: { path: string; hits: Hit[] }[] = [];
    for (const [path, file] of Object.entries(files)) {
      if (file.hidden) continue;
      const code = file.code ?? "";
      const haystack = caseSensitive ? code : code.toLowerCase();
      let idx = 0;
      let firstHitsForFile: Hit[] = [];
      while (true) {
        const found = haystack.indexOf(q, idx);
        if (found === -1) break;
        const before = code.lastIndexOf("\n", found - 1);
        const after = code.indexOf("\n", found + q.length);
        const lineStart = before + 1;
        const lineEnd = after === -1 ? code.length : after;
        const line = code.slice(0, found).split("\n").length;
        firstHitsForFile.push({
          path,
          line,
          col: found - lineStart + 1,
          preview: code.slice(lineStart, lineEnd),
          matchStart: found - lineStart,
          matchEnd: found - lineStart + q.length,
        });
        idx = found + q.length;
        if (firstHitsForFile.length >= 20) break;
      }
      if (firstHitsForFile.length)
        groups.push({ path, hits: firstHitsForFile });
    }
    return groups;
  }, [files, query, caseSensitive]);

  const totalHits = results.reduce((s, g) => s + g.hits.length, 0);

  return (
    <div className="flex h-full flex-col text-[13px]">
      <div className="bg-muted/40 flex h-9 shrink-0 items-center border-b px-2.5 select-none">
        <div className="text-muted-foreground text-[10px] font-bold tracking-[0.16em] uppercase">
          Search
        </div>
      </div>
      <div className="border-b px-3 py-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search across files"
          className="bg-background focus:ring-primary/40 h-8 w-full rounded border px-2 text-sm outline-none focus:ring-1"
        />
        <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setCaseSensitive((v) => !v)}
            className={cn(
              "rounded border px-1.5 py-0.5",
              caseSensitive && "border-primary text-primary",
            )}
            title="Case sensitive"
          >
            Aa
          </button>
          <span>
            {query
              ? `${totalHits} result${totalHits === 1 ? "" : "s"} in ${results.length} file${results.length === 1 ? "" : "s"}`
              : "Type to search"}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-auto py-1">
        {results.map((group) => {
          return (
            <div key={group.path} className="mb-1">
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs">
                <FileIcon path={group.path} />
                <span className="truncate font-medium">
                  {getDisplayName(group.path)}
                </span>
                <span className="text-muted-foreground ml-auto text-[10px]">
                  {group.path}
                </span>
              </div>
              {group.hits.map((h, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => openFile(h.path)}
                  className="hover:bg-accent/60 flex w-full items-center gap-2 px-3 py-[3px] text-left text-[12px]"
                >
                  <span className="text-muted-foreground w-8 text-right tabular-nums">
                    {h.line}
                  </span>
                  <span className="truncate font-mono">
                    {h.preview.slice(0, h.matchStart)}
                    <mark className="text-foreground rounded-sm bg-yellow-500/40">
                      {h.preview.slice(h.matchStart, h.matchEnd)}
                    </mark>
                    {h.preview.slice(h.matchEnd)}
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
