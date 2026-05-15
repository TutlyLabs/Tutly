"use client";

import {
  SandpackTests,
  useSandpack,
  useSandpackConsole,
} from "@codesandbox/sandpack-react";
import {
  ChevronDown,
  ChevronUp,
  MoveHorizontal,
  Play,
  Terminal as TerminalIcon,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { cn } from "@tutly/utils";

import IconButton from "./IconButton";
import { useIDE } from "./ideStore";
import "./sandpack-overrides.css";

type LogEntry = { type: string; args: unknown[]; id: string };

type BottomPanelProps = {
  isStatic: boolean;
  staticLogs: LogEntry[];
  onClearStaticLogs: () => void;
};

type TabId = "console" | "problems" | "tests";

export default function BottomPanel({
  isStatic,
  staticLogs,
  onClearStaticLogs,
}: BottomPanelProps) {
  const { state, setBottomActive, toggleBottom, setBottomPosition } = useIDE();
  const collapsed = state.bottomPanel.collapsed;
  const position = state.bottomPanel.position;
  const { sandpack, dispatch } = useSandpack();

  const hasTestFiles = useMemo(
    () =>
      Object.keys(sandpack.files).some((p) =>
        /.*\.(test|spec)\.[tj]sx?$/.test(p),
      ),
    [sandpack.files],
  );

  const [testStatus, setTestStatus] = useState<"idle" | "running" | "complete">(
    "idle",
  );
  const [showTestDetails, setShowTestDetails] = useState(false);

  const runTests = () => {
    setTestStatus("running");
    setTimeout(() => {
      dispatch({ type: "run-all-tests" });
    }, 200);
  };

  const tabs = useMemo(() => {
    const list: { id: TabId; label: string }[] = [
      { id: "console", label: "Console" },
    ];
    if (hasTestFiles) list.push({ id: "tests", label: "Tests" });
    return list;
  }, [hasTestFiles]);

  useEffect(() => {
    if (state.bottomPanel.active === "tests" && !hasTestFiles) {
      setBottomActive("console");
    }
    if (state.bottomPanel.active === "problems") {
      setBottomActive("console");
    }
  }, [state.bottomPanel.active, hasTestFiles, setBottomActive]);

  const onClear = () => {
    if (state.bottomPanel.active === "console" && isStatic) {
      onClearStaticLogs();
    }
  };

  return (
    <div className="bg-background flex h-full min-h-0 flex-col">
      <div className="bg-muted/40 flex h-9 shrink-0 items-center justify-between border-b pr-2 pl-1">
        <div className="flex h-full items-stretch">
          {tabs.map((t) => {
            const active = state.bottomPanel.active === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setBottomActive(t.id)}
                className={cn(
                  "relative inline-flex h-full cursor-pointer items-center gap-1.5 px-3 text-[11px] font-semibold tracking-wider uppercase transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{t.label}</span>
                {active && (
                  <span className="bg-primary pointer-events-none absolute inset-x-2 -bottom-px h-[2px] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          {!collapsed && state.bottomPanel.active === "console" && (
            <IconButton tooltip="Clear console" onClick={onClear}>
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
          )}
          {!collapsed &&
            state.bottomPanel.active === "tests" &&
            hasTestFiles && (
              <>
                <button
                  type="button"
                  onClick={() => setShowTestDetails((v) => !v)}
                  className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex h-6 cursor-pointer items-center rounded-md border px-2 text-[11px] font-medium transition-colors"
                >
                  {showTestDetails ? "Hide Details" : "Show Details"}
                </button>
                <button
                  type="button"
                  onClick={runTests}
                  disabled={testStatus === "running"}
                  className="inline-flex h-6 cursor-pointer items-center gap-1 rounded-md bg-emerald-600 px-2 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
                >
                  <Play className="h-3 w-3" />
                  {testStatus === "running" ? "Running…" : "Run Tests"}
                </button>
              </>
            )}
          <IconButton
            tooltip={
              position === "preview"
                ? "Move below editor"
                : "Move below preview"
            }
            onClick={() =>
              setBottomPosition(position === "preview" ? "editor" : "preview")
            }
          >
            <MoveHorizontal className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            tooltip={collapsed ? "Expand Panel" : "Collapse Panel"}
            shortcut="⌘J"
            onClick={toggleBottom}
          >
            {collapsed ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </IconButton>
        </div>
      </div>

      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-hidden">
          {state.bottomPanel.active === "console" &&
            (isStatic ? (
              <StaticConsoleView logs={staticLogs} />
            ) : (
              <BundledConsole />
            ))}
          {state.bottomPanel.active === "tests" && hasTestFiles && (
            <TestsPanel
              showDetails={showTestDetails}
              onComplete={() => {
                queueMicrotask(() => setTestStatus("complete"));
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint?: ReactNode;
}) {
  return (
    <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="bg-muted/40 grid h-9 w-9 place-items-center rounded-md border">
        {icon}
      </div>
      <div className="text-foreground/80 text-sm font-medium">{title}</div>
      {hint && <div className="text-[11px] leading-relaxed">{hint}</div>}
    </div>
  );
}

function formatArg(arg: unknown): string {
  if (arg === null) return "null";
  if (arg === undefined) return "undefined";
  if (typeof arg === "string") return arg;
  if (typeof arg === "number" || typeof arg === "boolean") return String(arg);
  try {
    return JSON.stringify(arg, null, 2);
  } catch {
    return "[Circular]";
  }
}

function StaticConsoleView({ logs }: { logs: LogEntry[] }) {
  if (logs.length === 0) {
    return (
      <EmptyState
        icon={<TerminalIcon className="h-4 w-4" />}
        title="No console output yet"
        hint={
          <>
            Try{" "}
            <code className="bg-muted rounded px-1 py-0.5">
              console.log(...)
            </code>{" "}
            in your code.
          </>
        }
      />
    );
  }
  return (
    <div className="h-full overflow-auto p-2 font-mono text-[12px] leading-relaxed">
      {logs.map((log) => (
        <div
          key={log.id}
          className={cn(
            "border-border/50 flex gap-2 border-b px-1 py-1 whitespace-pre-wrap",
            log.type === "error" && "text-red-500",
            log.type === "warn" && "text-amber-500",
            log.type === "info" && "text-sky-500",
          )}
        >
          <span className="shrink-0 text-[10px] tracking-wider uppercase opacity-50">
            {log.type}
          </span>
          <span className="flex-1 break-words">
            {log.args.map((a, i) => (
              <span key={i}>
                {formatArg(a)}
                {i < log.args.length - 1 ? " " : ""}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

function BundledConsole() {
  const { logs } = useSandpackConsole({ resetOnPreviewRestart: true });
  if (logs.length === 0) {
    return (
      <EmptyState
        icon={<TerminalIcon className="h-4 w-4" />}
        title="No console output yet"
        hint="Run your code to see logs here."
      />
    );
  }
  return (
    <div className="h-full overflow-auto p-2 font-mono text-[12px] leading-relaxed">
      {logs.map((log, i) => (
        <div
          key={i}
          className={cn(
            "border-border/50 flex gap-2 border-b px-1 py-1 whitespace-pre-wrap",
            log.method === "error" && "text-red-500",
            log.method === "warn" && "text-amber-500",
            log.method === "info" && "text-sky-500",
          )}
        >
          <span className="shrink-0 text-[10px] tracking-wider uppercase opacity-50">
            {log.method}
          </span>
          <span className="flex-1 break-words">
            {Array.isArray(log.data)
              ? log.data.map((a, k) => (
                  <span key={k}>
                    {formatArg(a)}
                    {k < (log.data?.length ?? 0) - 1 ? " " : ""}
                  </span>
                ))
              : formatArg(log.data)}
          </span>
        </div>
      ))}
    </div>
  );
}

function TestsPanel({
  showDetails,
  onComplete,
}: {
  showDetails: boolean;
  onComplete: () => void;
}) {
  return (
    <SandpackTests
      verbose
      watchMode
      showVerboseButton={false}
      onComplete={onComplete}
      style={{ height: "100%", width: "100%", overflow: "auto" }}
      className={showDetails ? "show-test-details" : "hide-test-details"}
    />
  );
}

export { EmptyState };
