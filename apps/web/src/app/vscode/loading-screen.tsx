"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LoadingStep {
  id: string;
  label: string;
  duration: number;
}

const STEPS: LoadingStep[] = [
  {
    id: "env",
    label: "Setting up your isolated environment...",
    duration: 2500,
  },
  {
    id: "assignment",
    label: "Configuring assignment workspace...",
    duration: 2000,
  },
  {
    id: "submission",
    label: "Synchronizing repository state...",
    duration: 2000,
  },
];

interface VSCodeLoadingScreenProps {
  isVSCodeReady: boolean;
  onStart: () => void;
}

export function VSCodeLoadingScreen({
  isVSCodeReady,
  onStart,
}: VSCodeLoadingScreenProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFakeLoadingDone, setIsFakeLoadingDone] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const processStep = (index: number) => {
      if (index >= STEPS.length) {
        setIsFakeLoadingDone(true);
        return;
      }

      setCurrentStepIndex(index);
      const step = STEPS[index];
      timeout = setTimeout(() => {
        processStep(index + 1);
      }, step.duration);
    };

    processStep(0);

    return () => clearTimeout(timeout);
  }, []);

  const isReady = isFakeLoadingDone && isVSCodeReady;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#09090b] text-white">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] animate-pulse rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="absolute right-[-10%] bottom-[-10%] h-[40%] w-[40%] animate-pulse rounded-full bg-purple-600/20 blur-[120px]" />
      <div className="absolute top-[40%] left-[50%] h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-indigo-500/10 blur-[100px]" />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center px-8">
        <div className="mb-16 space-y-6 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl">
            <Terminal className="h-10 w-10 text-white" />
          </div>
          <h1 className="bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-5xl font-bold tracking-tighter text-transparent md:text-6xl">
            Ready to Code?
          </h1>
          <p className="mx-auto max-w-lg text-xl font-light tracking-wide text-white/60">
            We're preparing your workspace. Here are a few things to remember:
          </p>
        </div>

        <div className="mb-16 w-full max-w-md space-y-8">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentStepIndex || isFakeLoadingDone;
            const isCurrent = index === currentStepIndex && !isFakeLoadingDone;
            const isPending = index > currentStepIndex && !isFakeLoadingDone;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-5 transition-all duration-500",
                  isPending
                    ? "translate-y-2 opacity-20 blur-[1px]"
                    : "translate-y-0 opacity-100",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-500",
                    isCompleted
                      ? "border-green-500/50 bg-green-500/20 text-green-400"
                      : isCurrent
                        ? "scale-110 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                        : "border-white/10 text-transparent",
                  )}
                >
                  {isCompleted ? (
                    <Check className="animate-in fade-in zoom-in h-4 w-4 duration-300" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-lg font-medium tracking-wide transition-colors duration-300",
                    isCompleted
                      ? "text-white/40 line-through decoration-white/20"
                      : isCurrent
                        ? "origin-left scale-105 text-white"
                        : "text-white/30",
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}

          {/* VSCode Readiness Step */}
          <div
            className={cn(
              "flex items-center gap-5 transition-all duration-500",
              isFakeLoadingDone && !isVSCodeReady
                ? "translate-y-0 opacity-100"
                : "h-0 translate-y-4 overflow-hidden opacity-0",
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-yellow-500/50 bg-yellow-500/10 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <span className="animate-pulse text-lg font-medium tracking-wide text-yellow-400">
              Finalizing environment setup...
            </span>
          </div>
        </div>

        <div
          className={cn(
            "cubic-bezier(0.4, 0, 0.2, 1) transition-all duration-1000",
            isReady
              ? "translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-8 scale-95 opacity-0",
          )}
        >
          <Button
            onClick={onStart}
            size="lg"
            className="h-16 cursor-pointer rounded-full border border-white/50 bg-gradient-to-r from-white via-gray-200 to-gray-400 px-12 text-xl font-semibold text-black shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]"
          >
            Start Coding
          </Button>
        </div>
      </div>

      <div className="absolute bottom-8 text-xs font-light tracking-[0.2em] text-white/20 uppercase">
        Powered by Tutly
      </div>
    </div>
  );
}
