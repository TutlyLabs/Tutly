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
    <div className="h-full bg-white">
      <div className="flex justify-between px-10 py-2">
        <h1 className="text-lg font-semibold text-gray-600">Console</h1>
        <button
          className="rounded bg-blue-500 px-2 py-1 text-white"
          onClick={reset}
        >
          Clear
        </button>
      </div>
      <div className="overflow-auto">
        {logs.map((log, index) => (
          <div key={index} className="p-2">
            {formatLogData(log.data)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SandboxConsole;
