"use client";

import { ScrollArea, ScrollBar } from "@tutly/ui/scroll-area";
import { cn } from "@tutly/utils";

export interface ChipOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ElementType;
  badge?: string | number;
  disabled?: boolean;
}

interface FilterChipRowProps<T extends string = string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
  /** Accessible name for the row, falls back to "filter". */
  ariaLabel?: string;
  /** When true, renders a flush-edge variant that scrolls beyond the gutter. */
  bleed?: boolean;
}

/**
 * Reusable horizontal chip filter row.
 *
 * Use across pages to keep filter UI uniform (courses, assignments,
 * leaderboard, statistics, certificate, drive, etc).
 */
export function FilterChipRow<T extends string = string>({
  options,
  value,
  onChange,
  className,
  ariaLabel = "filter",
  bleed = true,
}: FilterChipRowProps<T>) {
  return (
    <ScrollArea
      className={cn(bleed ? "-mx-3 sm:mx-0" : "", className)}
      aria-label={ariaLabel}
    >
      <div
        className={cn(
          "flex items-center gap-2 pb-2",
          bleed ? "px-3 sm:px-0" : "",
        )}
        role="tablist"
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={opt.disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "bg-card text-foreground/70 hover:bg-accent hover:text-foreground",
                opt.disabled && "cursor-not-allowed opacity-50",
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              <span className="max-w-[160px] truncate">{opt.label}</span>
              {opt.badge != null && (
                <span
                  className={cn(
                    "ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {opt.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" className="hidden" />
    </ScrollArea>
  );
}
