"use client";

import { Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@tutly/ui/tooltip";

export function ScoreFormulaHint() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Scoring formula"
          className="text-muted-foreground hover:text-foreground ml-1 inline-flex align-middle"
        >
          <Info className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        <div className="space-y-1">
          <div>
            <span className="font-medium">Score</span> — mentor evaluates
            assignment (0–10)
          </div>
          <div>
            <span className="font-medium">Test Cases</span> — auto evaluated
            including hidden testcases (10 × passed / total)
          </div>
          <div>
            <span className="font-medium">Total</span> = Score + Test Cases
            (max 20)
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
