"use client";

import { cn } from "@tutly/utils";

const MAX_WIDTH_MAP = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
} as const;

const SPACING_MAP = {
  sm: "space-y-3",
  md: "space-y-4",
  lg: "space-y-4 sm:space-y-6",
} as const;

interface PageShellProps {
  children: React.ReactNode;
  /** Optional page title (renders the standard h1). */
  title?: React.ReactNode;
  /** Optional subtitle below the title. */
  description?: React.ReactNode;
  /** Optional right-aligned action(s) in the header row. */
  action?: React.ReactNode;
  /** Container max width. Defaults to 7xl. */
  max?: keyof typeof MAX_WIDTH_MAP;
  /** Vertical rhythm between top-level children. Defaults to lg. */
  spacing?: keyof typeof SPACING_MAP;
  className?: string;
  /** Override or extend container className (e.g. add px-0 for full-bleed sections). */
  containerClassName?: string;
}

/**
 * PageShell standardizes page outer container, max width, and the header pattern.
 *
 * Use it as the top-level wrapper for any protected route page so every
 * page has the same gutter, the same vertical rhythm, and the same
 * title/description treatment.
 */
export function PageShell({
  children,
  title,
  description,
  action,
  max = "7xl",
  spacing = "lg",
  className,
  containerClassName,
}: PageShellProps) {
  const showHeader = Boolean(title || description || action);
  return (
    <div
      className={cn(
        "mx-auto w-full",
        MAX_WIDTH_MAP[max],
        SPACING_MAP[spacing],
        className,
      )}
    >
      {showHeader && (
        <div
          className={cn(
            "flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end sm:gap-4",
            containerClassName,
          )}
        >
          <div className="min-w-0">
            {title && (
              <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-muted-foreground text-sm">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
