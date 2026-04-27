"use client";

import { useSandpackConsole } from "@codesandbox/sandpack-react";

const SandboxConsole = () => {
  const { logs, reset } = useSandpackConsole({
    resetOnPreviewRestart: true,
  });

  const formatLogData = (data: unknown): string => {
    if (data === null) return "null";
    if (data === undefined) return "undefined";
    if (typeof data === "string") return data;
    if (typeof data === "number") return data.toString();
    if (typeof data === "boolean") return data.toString();
    if (Array.isArray(data)) return data.map(formatLogData).join(", ");
    if (typeof data === "object") {
      try {
        return JSON.stringify(data, null, 2);
      } catch {
        return "[Circular]";
      }
    }
    return "[Unknown Type]";
  };

  return (
    <div className="bg-card h-full">
      <div className="bg-muted/30 flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-foreground text-sm font-semibold">Console</h1>
        <button
          type="button"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-7 cursor-pointer items-center rounded-md px-2.5 text-xs font-medium transition-colors"
          onClick={reset}
        >
          Clear
        </button>
      </div>
      <div className="text-foreground/90 overflow-auto p-3 font-mono text-xs">
        {logs.map((log, index) => (
          <div key={index} className="p-1 whitespace-pre-wrap">
            {formatLogData(log.data)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SandboxConsole;
