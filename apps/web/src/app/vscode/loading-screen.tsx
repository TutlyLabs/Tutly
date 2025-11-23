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
  { id: "env", label: "Setting up your isolated environment...", duration: 2500 },
  { id: "assignment", label: "Configuring assignment workspace...", duration: 2000 },
  { id: "submission", label: "Synchronizing repository state...", duration: 2000 },
];

interface VSCodeLoadingScreenProps {
  isVSCodeReady: boolean;
  onStart: () => void;
}

export function VSCodeLoadingScreen({ isVSCodeReady, onStart }: VSCodeLoadingScreenProps) {
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
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#09090b] text-white overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" />
      <div className="absolute top-[40%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[100px]" />

      <div className="relative z-10 flex flex-col items-center max-w-2xl w-full px-8">
        <div className="mb-16 text-center space-y-6">
          <div className="inline-flex items-center justify-center p-4 mb-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
            <Terminal className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/40">
            Ready to Code?
          </h1>
          <p className="text-xl text-white/60 font-light tracking-wide max-w-lg mx-auto">
            We're preparing your workspace. Here are a few things to remember:
          </p>
        </div>

        <div className="w-full max-w-md space-y-8 mb-16">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentStepIndex || isFakeLoadingDone;
            const isCurrent = index === currentStepIndex && !isFakeLoadingDone;
            const isPending = index > currentStepIndex && !isFakeLoadingDone;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-5 transition-all duration-500",
                  isPending ? "opacity-20 blur-[1px] translate-y-2" : "opacity-100 translate-y-0"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-500 shrink-0",
                  isCompleted ? "bg-green-500/20 border-green-500/50 text-green-400" :
                    isCurrent ? "border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-110" :
                      "border-white/10 text-transparent"
                )}>
                  {isCompleted ? (
                    <Check className="w-4 h-4 animate-in fade-in zoom-in duration-300" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  )}
                </div>
                <span className={cn(
                  "text-lg font-medium tracking-wide transition-colors duration-300",
                  isCompleted ? "text-white/40 line-through decoration-white/20" :
                    isCurrent ? "text-white scale-105 origin-left" :
                      "text-white/30"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}

          {/* VSCode Readiness Step */}
          <div className={cn(
            "flex items-center gap-5 transition-all duration-500",
            isFakeLoadingDone && !isVSCodeReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 h-0 overflow-hidden"
          )}>
            <div className="flex items-center justify-center w-8 h-8 rounded-full border border-yellow-500/50 text-yellow-400 bg-yellow-500/10 shadow-[0_0_20px_rgba(234,179,8,0.3)] shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <span className="text-lg font-medium text-yellow-400 tracking-wide animate-pulse">
              Finalizing environment setup...
            </span>
          </div>
        </div>

        <div className={cn(
          "transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1)",
          isReady ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95 pointer-events-none"
        )}>
          <Button
            onClick={onStart}
            size="lg"
            className="h-16 px-12 text-xl font-semibold rounded-full bg-gradient-to-r from-white via-gray-200 to-gray-400 text-black hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] border border-white/50 cursor-pointer"
          >
            Start Coding
          </Button>
        </div>
      </div>

      <div className="absolute bottom-8 text-xs text-white/20 tracking-[0.2em] uppercase font-light">
        Powered by Tutly
      </div>
    </div>
  );
}
