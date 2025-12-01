"use client";

import { useState, useEffect } from "react";
import {
  Check,
  Loader2,
  Terminal,
  Play,
  AlertCircle,
  Copy,
  CheckCircle2,
  Chrome,
  Wifi,
  WifiOff,
  FolderOpen,
  ArrowRight,
  Command,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PlaygroundHelpDialog } from "./playground-help-dialog";

interface PlaygroundSetupScreenProps {
  assignmentId?: string;
  assignmentName?: string;
  courseName?: string;
  userName: string;
  onComplete: () => void;
}

type PreflightStatus = "checking" | "success" | "error";

const CommandDisplay = ({ command }: { command: string }) => {
  const parts = command.split(" ");

  return (
    <div className="truncate font-mono text-sm">
      {parts.map((part, i) => {
        let colorClass = "text-white/90";

        if (["npx", "git", "cd"].includes(part)) {
          colorClass = "text-purple-400 font-bold";
        } else if (part === "tutly") {
          colorClass = "text-blue-400 font-semibold";
        } else if (["assignment", "playground", "clone"].includes(part)) {
          colorClass = "text-cyan-400";
        } else {
          // Arguments / IDs / Paths
          colorClass = "text-emerald-200/90";
        }

        return (
          <span key={i} className={colorClass}>
            {part}
            {i < parts.length - 1 ? " " : ""}
          </span>
        );
      })}
    </div>
  );
};

export function LocalPlaygroundSetupScreen({
  assignmentId,
  assignmentName,
  courseName,
  userName,
  onComplete,
}: PlaygroundSetupScreenProps) {
  const [preflightStatus, setPreflightStatus] =
    useState<PreflightStatus>("checking");
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDirectory, setConnectedDirectory] = useState<string | null>(
    null,
  );
  const [browserSupported, setBrowserSupported] = useState(true);
  const [copiedSteps, setCopiedSteps] = useState<Set<number>>(new Set());
  const [repoUrl, setRepoUrl] = useState<string | null>(null);

  useEffect(() => {
    runPreflightChecks();

    if (assignmentId) {
      fetch(`/api/git/create?assignmentId=${assignmentId}&type=SUBMISSION`)
        .then((res) => res.json())
        .then((data) => {
          if (data.repoUrl) {
            setRepoUrl(data.repoUrl);
          }
        })
        .catch((err) => console.error("Failed to fetch repo URL:", err));
    }

    let interval: NodeJS.Timeout;
    if (!isConnected) {
      interval = setInterval(runPreflightChecks, 2000);
    }
    return () => clearInterval(interval);
  }, [isConnected, assignmentId]);

  const runPreflightChecks = async () => {
    // Check browser only once
    if (browserSupported) {
      const userAgent = navigator.userAgent.toLowerCase();
      const isBrave = !!(navigator as any).brave;
      const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
      if (isBrave || isSafari) setBrowserSupported(false);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);

      const response = await fetch("http://localhost:4242/api/health", {
        headers: { "x-api-key": "tutly-dev-key" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setConnectedDirectory(data.directory);
        setIsConnected(true);
        setPreflightStatus("success");
      } else {
        setIsConnected(false);
        setPreflightStatus("error");
      }
    } catch (error) {
      setIsConnected(false);
      setPreflightStatus("error");
    }
  };

  const handleCopy = (text: string, stepIndex: number) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
    setCopiedSteps(new Set(copiedSteps).add(stepIndex));
    setTimeout(() => {
      setCopiedSteps((prev) => {
        const next = new Set(prev);
        next.delete(stepIndex);
        return next;
      });
    }, 2000);
  };

  const getRepoName = (url: string) => {
    return url.split("/").pop()?.replace(".git", "") || "assignment";
  };

  const setupCommands = assignmentId
    ? [
        {
          command: repoUrl
            ? `git clone ${repoUrl}`
            : `npx tutly assignment ${assignmentId}`,
          label: repoUrl ? "Clone Repository" : "Clone Assignment",
        },
        {
          command: `cd ${repoUrl ? getRepoName(repoUrl) : assignmentId}`,
          label: "Enter Directory",
        },
        {
          command: "npx tutly playground",
          label: "Start Server",
        },
      ]
    : [
        {
          command: "cd /path/to/project",
          label: "Navigate to Project",
        },
        {
          command: "npx tutly playground",
          label: "Start Server",
        },
      ];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#09090b] text-white">
      {/* Ambient Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] h-[50%] w-[50%] animate-pulse rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="absolute right-[-10%] bottom-[-20%] h-[50%] w-[50%] animate-pulse rounded-full bg-purple-600/20 blur-[120px]" />

      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 items-center gap-8 p-6 lg:grid-cols-2">
        {/* Left Side: Welcome & Context */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/60 backdrop-blur-md">
              <Terminal className="h-3 w-3" />
              <span>Local Environment</span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              <span className="mb-2 block text-2xl font-medium text-white/40">
                Hi {userName},
              </span>
              Let's get you <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                ready to code.
              </span>
            </h1>

            <p className="max-w-md text-lg leading-relaxed text-white/60">
              {isConnected
                ? "Your local playground is connected and ready. You can start coding immediately."
                : "Connect your local machine to start working on this assignment in a powerful isolated environment."}
            </p>
          </div>

          {assignmentName && (
            <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f14] p-1 transition-all hover:border-white/20">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent opacity-50" />

              <div className="relative flex items-center gap-5 rounded-xl bg-white/[0.02] p-5 backdrop-blur-sm">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 shadow-inner">
                  <Terminal className="h-7 w-7 text-blue-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-300">
                      Active Assignment
                    </span>
                    <span className="text-[10px] font-medium tracking-wider text-white/30 uppercase">
                      {courseName}
                    </span>
                  </div>
                  <h3 className="truncate text-xl leading-tight font-bold text-white">
                    {assignmentName}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 font-mono text-xs text-white/50">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                    Workspace Ready
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Action Card */}
        <div className="relative">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-20 blur-xl" />
          <div className="relative rounded-3xl border border-white/10 bg-[#0f0f14]/80 p-8 shadow-2xl backdrop-blur-xl">
            {/* Connection Status Header */}
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full transition-all duration-500",
                    isConnected
                      ? "bg-green-500/20 text-green-400"
                      : "bg-white/5 text-white/40",
                  )}
                >
                  {isConnected ? (
                    <Wifi className="h-5 w-5" />
                  ) : (
                    <WifiOff className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-white">
                      {isConnected
                        ? "System Connected"
                        : "Waiting for Connection"}
                    </div>
                    <PlaygroundHelpDialog />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isConnected
                          ? "animate-pulse bg-green-500"
                          : "bg-amber-500",
                      )}
                    />
                    {isConnected ? "localhost:4242" : "Checking status..."}
                  </div>
                </div>
              </div>

              {!isConnected && (
                <div className="h-8 w-8">
                  <Loader2 className="h-full w-full animate-spin text-white/20" />
                </div>
              )}
            </div>

            {isConnected ? (
              // Connected State
              <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
                <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-6">
                  <div className="flex items-start gap-4">
                    <FolderOpen className="mt-1 h-6 w-6 shrink-0 text-green-400" />
                    <div className="space-y-1 overflow-hidden">
                      <div className="text-sm font-medium text-green-400">
                        Connected Directory
                      </div>
                      <div
                        className="truncate font-mono text-lg text-white/90"
                        title={connectedDirectory || ""}
                      >
                        {connectedDirectory || "Unknown Directory"}
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={onComplete}
                  className="h-14 w-full rounded-xl bg-white text-lg font-semibold text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all hover:scale-[1.02] hover:bg-white/90 active:scale-[0.98]"
                >
                  Start Coding
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            ) : (
              // Disconnected State
              <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
                {/* Browser Warning if needed */}
                {!browserSupported && (
                  <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm">
                    <Chrome className="h-5 w-5 shrink-0 text-amber-400" />
                    <div className="text-amber-200/80">
                      <span className="font-semibold text-amber-200">
                        Browser Notice:
                      </span>{" "}
                      Chrome/Chromium recommended. Safari/Brave may require{" "}
                      <a
                        href="https://github.com/FiloSottile/mkcert"
                        target="_blank"
                        className="underline decoration-amber-500/50 hover:text-amber-100"
                      >
                        mkcert
                      </a>{" "}
                      setup.
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Run in your terminal:</span>
                    <span className="text-xs text-white/40">v1.0.0</span>
                  </div>

                  <div className="space-y-2">
                    {setupCommands.map((step, idx) => (
                      <div
                        key={idx}
                        className="group relative flex items-center gap-3 rounded-xl border border-white/5 bg-black/40 p-3 pr-14 transition-all hover:border-white/10 hover:bg-black/60"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-medium text-white/60">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <CommandDisplay command={step.command} />
                          <div className="mt-0.5 text-[10px] font-medium tracking-wider text-white/30 uppercase">
                            {step.label}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleCopy(step.command, idx)}
                          className="absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2 text-white/40 opacity-0 transition-all group-hover:opacity-100 hover:bg-white/10 hover:text-white"
                        >
                          {copiedSteps.has(idx) ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <p className="text-xs text-white/30">
                    Waiting for local server on port 4242...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute right-0 bottom-6 left-0 text-center">
        <div className="inline-flex items-center gap-2 text-[10px] font-medium tracking-[0.2em] text-white/20 uppercase">
          <span>Powered by Tutly</span>
          <span className="h-1 w-1 rounded-full bg-white/20" />
          <span>Secure Environment</span>
        </div>
      </div>
    </div>
  );
}
