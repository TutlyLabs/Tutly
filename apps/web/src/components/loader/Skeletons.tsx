"use client";

import { Skeleton } from "@tutly/ui/skeleton";
import { cn } from "@tutly/utils";

interface PageProps {
  className?: string;
}

export function PageHeaderSkeleton({ className }: PageProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Skeleton className="h-7 w-44" />
      <Skeleton className="h-4 w-64 max-w-full" />
    </div>
  );
}

export function CardSkeleton({ className }: PageProps) {
  return (
    <div
      className={cn(
        "bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-sm",
        className,
      )}
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function StatGridSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListSkeleton({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card divide-border divide-y rounded-xl border shadow-sm",
        className,
      )}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-card flex flex-col gap-3 overflow-hidden rounded-xl border shadow-sm"
        >
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 8,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card overflow-hidden rounded-xl border shadow-sm",
        className,
      )}
    >
      <div
        className="grid border-b p-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="mx-2 h-3 w-2/3" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid border-b p-3 last:border-b-0"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("mx-2 h-3.5", c === 0 ? "w-3/4" : "w-1/2")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton({ className }: PageProps) {
  return (
    <div
      className={cn("mx-auto flex w-full max-w-7xl flex-col gap-6", className)}
    >
      <PageHeaderSkeleton />
      <StatGridSkeleton count={4} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="bg-card rounded-xl border p-4 shadow-sm lg:col-span-2">
          <Skeleton className="mb-4 h-4 w-32" />
          <Skeleton className="h-64 w-full" />
        </div>
        <ListSkeleton rows={5} />
      </div>
    </div>
  );
}

export function FormSkeleton({ className }: PageProps) {
  return (
    <div
      className={cn(
        "bg-card mx-auto w-full max-w-xl space-y-4 rounded-xl border p-6 shadow-sm",
        className,
      )}
    >
      <Skeleton className="h-6 w-1/3" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="ml-auto h-10 w-28" />
    </div>
  );
}

export function CalendarSkeleton({ className }: PageProps) {
  return (
    <div className={cn("flex h-full gap-4", className)}>
      <div className="bg-card hidden w-72 shrink-0 rounded-xl border p-4 shadow-sm md:block">
        <Skeleton className="mb-4 h-5 w-24" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="mb-3 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
      <div className="bg-card flex-1 rounded-xl border p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function FullPageSpinnerSkeleton({ className }: PageProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-7xl flex-col gap-6",
        className,
      )}
    >
      <PageHeaderSkeleton />
      <StatGridSkeleton count={4} />
      <ListSkeleton rows={6} />
    </div>
  );
}

export function AppShellSkeleton({ className }: PageProps) {
  return (
    <div className={cn("flex h-screen w-full overflow-hidden", className)}>
      {/* Sidebar — desktop only */}
      <aside className="bg-sidebar/80 hidden w-[212px] shrink-0 flex-col border-r p-3 sm:flex">
        <div className="mb-4 flex items-center gap-2 px-1.5">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="space-y-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-9 w-full rounded-md"
              style={{ opacity: 1 - i * 0.06 }}
            />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header
          className="bg-background/85 supports-[backdrop-filter]:bg-background/65 sticky top-0 z-40 flex shrink-0 items-center justify-between gap-2 border-b px-3 backdrop-blur sm:px-4"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            height: "calc(3.5rem + env(safe-area-inset-top))",
          }}
        >
          <div className="flex items-center gap-2 pl-12 sm:pl-0">
            <Skeleton className="h-7 w-7 rounded-lg sm:hidden" />
            <Skeleton className="hidden h-3 w-32 sm:block" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-xl" />
          </div>
        </header>
        {/* Body */}
        <main className="flex-1 overflow-hidden p-4 sm:p-6">
          <FullPageSpinnerSkeleton />
        </main>
        {/* Mobile bottom nav placeholder */}
        <nav
          className="bg-background/85 fixed inset-x-0 bottom-0 z-40 flex h-[68px] items-center justify-between border-t px-3 backdrop-blur sm:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-1 flex-col items-center gap-1 py-2"
            >
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-2 w-10" />
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
