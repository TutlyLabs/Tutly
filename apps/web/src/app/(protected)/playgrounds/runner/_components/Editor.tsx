"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { Button } from "@tutly/ui/button";

import type { RunnerClient } from "./RunnerClient";

const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false });

function languageFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    py: "python",
    rb: "ruby",
    java: "java",
    cs: "csharp",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    rs: "rust",
    go: "go",
    sql: "sql",
    html: "html",
    css: "css",
    scss: "scss",
    md: "markdown",
    yml: "yaml",
    yaml: "yaml",
    sh: "shell",
  };
  return map[ext] ?? "plaintext";
}

interface Props {
  client: RunnerClient;
  path: string | null;
}

export default function RunnerEditor({ client, path }: Props) {
  const [value, setValue] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valueRef = useRef("");
  valueRef.current = value;

  useEffect(() => {
    if (!path) {
      setValue("");
      setOriginal("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const content = await client.readFile(path);
        if (cancelled) return;
        setValue(content);
        setOriginal(content);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setValue("");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, path]);

  const save = useCallback(async () => {
    if (!path) return;
    setSaving(true);
    try {
      await client.writeFile(path, valueRef.current);
      setOriginal(valueRef.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [client, path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  if (!path) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Select a file from the tree on the left.
      </div>
    );
  }

  const dirty = value !== original;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="bg-card flex items-center justify-between border-b px-3 py-1.5">
        <span className="text-foreground truncate font-mono text-xs">
          {path}
          {dirty && <span className="text-amber-500"> ●</span>}
        </span>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-destructive truncate text-xs">{error}</span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => void save()}
            disabled={saving || !dirty}
          >
            {saving ? "Saving…" : dirty ? "Save (⌘S)" : "Saved"}
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {loading ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            Loading…
          </div>
        ) : (
          <Monaco
            language={languageFor(path)}
            value={value}
            theme="vs-dark"
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              automaticLayout: true,
              tabSize: 2,
            }}
            onChange={(v) => setValue(v ?? "")}
          />
        )}
      </div>
    </div>
  );
}
