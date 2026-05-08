"use client";

import { useActiveCode, useSandpack } from "@codesandbox/sandpack-react";
import Editor from "@monaco-editor/react";
import { Code2, FilePlus, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { cn } from "@tutly/utils";

const LANGUAGE_MAP: Record<string, string> = {
  html: "html",
  css: "css",
  js: "javascript",
  ts: "typescript",
  jsx: "javascript",
  tsx: "typescript",
  json: "json",
  md: "markdown",
};

const EXT_LABELS: Record<string, string> = {
  html: "HTML",
  css: "CSS",
  js: "JavaScript",
  ts: "TypeScript",
  jsx: "JSX",
  tsx: "TSX",
  json: "JSON",
  md: "Markdown",
};

const EXT_COLORS: Record<string, string> = {
  html: "text-orange-500",
  css: "text-sky-500",
  js: "text-amber-500",
  ts: "text-blue-500",
  jsx: "text-cyan-500",
  tsx: "text-cyan-500",
  json: "text-emerald-500",
  md: "text-violet-500",
};

function fileLabel(path: string) {
  const name = path.split("/").pop() ?? path;
  const ext = name.split(".").pop() ?? "";
  return { name, ext, label: EXT_LABELS[ext] ?? name };
}

export default function MonacoEditor() {
  const { code, updateCode } = useActiveCode();
  const { sandpack } = useSandpack();
  const { resolvedTheme } = useTheme();
  const [showAddInput, setShowAddInput] = useState(false);
  const [newPath, setNewPath] = useState("");

  const visibleFiles = sandpack.visibleFiles.length
    ? sandpack.visibleFiles
    : Object.keys(sandpack.files).filter((p) => !sandpack.files[p]?.hidden);

  const activeFile = sandpack.activeFile;
  const ext = activeFile.split(".").pop() ?? "";
  const language = LANGUAGE_MAP[ext] ?? "plaintext";

  const handleAddFile = () => {
    const trimmed = newPath.trim();
    if (!trimmed) return;
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    if (sandpack.files[path]) {
      alert("A file with this path already exists.");
      return;
    }
    sandpack.updateFile(path, "");
    sandpack.openFile(path);
    setNewPath("");
    setShowAddInput(false);
  };

  const handleDeleteFile = (path: string) => {
    if (visibleFiles.length <= 1) return;
    sandpack.deleteFile(path);
  };

  return (
    <div className="bg-card flex h-full flex-col">
      {/* Header: tabs + actions */}
      <div className="bg-card flex h-9 shrink-0 items-center gap-1 border-b pr-2">
        <div className="flex h-full flex-1 items-end overflow-x-auto">
          {visibleFiles.map((file) => {
            const { name, label } = fileLabel(file);
            const fileExt = name.split(".").pop() ?? "";
            const isActive = activeFile === file;
            return (
              <div
                key={file}
                className={cn(
                  "group relative inline-flex h-full shrink-0 items-center border-r text-xs font-medium transition-colors",
                  isActive
                    ? "text-foreground bg-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )}
              >
                {isActive && (
                  <span className="bg-primary pointer-events-none absolute inset-x-0 top-0 h-[2px]" />
                )}
                <button
                  type="button"
                  onClick={() => sandpack.openFile(file)}
                  className="inline-flex h-full items-center gap-1.5 pr-2 pl-3"
                >
                  <Code2 className={cn("h-3 w-3", EXT_COLORS[fileExt] ?? "")} />
                  {label}
                </button>
                {visibleFiles.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFile(file);
                    }}
                    className={cn(
                      "mr-1 hidden rounded p-0.5 transition-colors group-hover:inline-flex",
                      "hover:bg-destructive/10 hover:text-destructive",
                    )}
                    aria-label={`Delete ${name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={() => setShowAddInput((s) => !s)}
          className="hover:bg-accent text-muted-foreground inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors"
        >
          <FilePlus className="h-3.5 w-3.5" />
          New file
        </button>
      </div>

      {showAddInput && (
        <div className="bg-muted/40 flex h-10 shrink-0 items-center gap-2 border-b px-3">
          <input
            type="text"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddFile();
              if (e.key === "Escape") {
                setShowAddInput(false);
                setNewPath("");
              }
            }}
            placeholder="path/to/file.js"
            autoFocus
            className="border-input bg-background h-7 flex-1 rounded-md border px-2 text-xs"
          />
          <button
            onClick={handleAddFile}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-7 items-center rounded-md px-3 text-xs font-medium"
          >
            Create
          </button>
          <button
            onClick={() => {
              setShowAddInput(false);
              setNewPath("");
            }}
            className="hover:bg-accent text-muted-foreground inline-flex h-7 items-center rounded-md px-2 text-xs"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="bg-background flex-1 overflow-hidden">
        <Editor
          width="100%"
          height="100%"
          language={language}
          theme={resolvedTheme === "dark" ? "vs-dark" : "vs-light"}
          key={activeFile}
          value={code}
          onChange={(value) => updateCode(value || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>
    </div>
  );
}
