"use client";

import { type ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@tutly/ui/tooltip";
import { cn } from "@tutly/utils";

type Props = {
  tooltip: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  children: ReactNode;
  ariaLabel?: string;
  shortcut?: string;
};

// No forwardRef: Radix TooltipTrigger asChild + forwardRef loops under React 19 StrictMode.
export default function IconButton({
  tooltip,
  onClick,
  active,
  disabled,
  className,
  side = "bottom",
  children,
  ariaLabel,
  shortcut,
}: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={
            ariaLabel ?? (typeof tooltip === "string" ? tooltip : undefined)
          }
          className={cn(
            "text-muted-foreground inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors",
            "hover:bg-accent hover:text-foreground",
            "focus-visible:ring-ring/40 focus-visible:ring-2 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            active && "bg-accent text-foreground",
            className,
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="flex items-center gap-2">
        <span>{tooltip}</span>
        {shortcut && (
          <kbd className="border-primary-foreground/30 bg-primary-foreground/10 rounded border px-1 text-[10px] font-medium tracking-wider">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
