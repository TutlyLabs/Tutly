"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@tutly/ui/button";
import { Input } from "@tutly/ui/input";
import { Skeleton } from "@tutly/ui/skeleton";
import { cn, dayjs, formatDurationSeconds } from "@tutly/utils";

import { api } from "@/trpc/react";

type StatusFilter = "all" | "UPLOADING" | "PROCESSING" | "READY" | "FAILED";

interface StatusMeta {
  label: string;
  pill: string;
  ring: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const STATUS_META: Record<
  "UPLOADING" | "PROCESSING" | "READY" | "FAILED",
  StatusMeta
> = {
  UPLOADING: {
    label: "Uploading",
    pill: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    ring: "ring-blue-500/30",
    Icon: Upload,
  },
  PROCESSING: {
    label: "Processing",
    pill: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    ring: "ring-amber-500/30",
    Icon: Sparkles,
  },
  READY: {
    label: "Ready",
    pill: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    ring: "ring-emerald-500/30",
    Icon: CheckCircle2,
  },
  FAILED: {
    label: "Failed",
    pill: "bg-red-500/15 text-red-700 dark:text-red-400",
    ring: "ring-red-500/30",
    Icon: XCircle,
  },
};

const FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "PROCESSING", label: "Processing" },
  { value: "READY", label: "Ready" },
  { value: "FAILED", label: "Failed" },
  { value: "UPLOADING", label: "Uploading" },
];

export default function VideoRunsPage() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const runsQuery = api.videos.listRuns.useQuery(
    { status: filter, limit: 100 },
    {
      refetchInterval: (q) => {
        // Auto-refresh while there's anything live happening.
        const counts = q.state.data?.counts;
        if (!counts) return 5000;
        const hasLive =
          (counts.UPLOADING ?? 0) > 0 || (counts.PROCESSING ?? 0) > 0;
        return hasLive ? 3000 : 30_000;
      },
    },
  );

  const retry = api.videos.retry.useMutation({
    onSuccess: () => {
      toast.success("Re-queued for processing");
      void runsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const counts = runsQuery.data?.counts ?? {
    UPLOADING: 0,
    PROCESSING: 0,
    READY: 0,
    FAILED: 0,
  };

  const filtered = useMemo(() => {
    const all = runsQuery.data?.runs ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter((r) => {
      const cls = r.class[0];
      return (
        cls?.title?.toLowerCase().includes(q) ||
        cls?.course?.title?.toLowerCase().includes(q)
      );
    });
  }, [runsQuery.data, search]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6">
      {/* Hero */}
      <div className="bg-card relative overflow-hidden rounded-2xl border p-5 shadow-sm">
        <div className="bg-amber-500/10 pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-foreground inline-flex items-center gap-2 text-xl font-semibold">
                <Activity className="text-amber-500 h-5 w-5" />
                Video runs
              </h1>
              {(counts.PROCESSING > 0 || counts.UPLOADING > 0) && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  </span>
                  Live
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Status of every class video being transcoded. Auto-refreshes while
              jobs are live.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <CountChip
              label="Processing"
              value={counts.PROCESSING}
              tone="amber"
            />
            <CountChip label="Ready" value={counts.READY} tone="emerald" />
            <CountChip label="Failed" value={counts.FAILED} tone="red" />
            {counts.UPLOADING > 0 && (
              <CountChip
                label="Uploading"
                value={counts.UPLOADING}
                tone="blue"
              />
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
        <div className="-mx-1 overflow-x-auto px-1 sm:mx-0 sm:px-0">
          <div className="bg-muted/40 inline-flex items-center gap-1 rounded-full p-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value)}
                className={cn(
                  "h-7 shrink-0 rounded-full px-3 text-xs font-medium whitespace-nowrap transition-colors",
                  filter === tab.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {tab.value !== "all" &&
                  counts[tab.value as keyof typeof counts] > 0 && (
                    <span className="ml-1.5 opacity-70">
                      {counts[tab.value as keyof typeof counts]}
                    </span>
                  )}
              </button>
            ))}
          </div>
        </div>
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by class or course"
            className="h-9 rounded-full text-sm"
          />
        </div>
      </div>

      {/* Runs list */}
      <div className="bg-card divide-border divide-y rounded-xl border shadow-sm">
        {runsQuery.isLoading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-9 w-9 rounded-md" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground p-12 text-center text-sm">
            <p className="text-foreground text-sm font-medium">
              No runs match the current filter
            </p>
            <p className="mt-1 text-xs">
              Upload an HLS class video and you'll see it here while it's being
              transcoded.
            </p>
          </div>
        ) : (
          filtered.map((run) => (
            <RunRow
              key={run.id}
              run={run}
              onRetry={() => retry.mutate({ videoId: run.id })}
              isRetrying={retry.isPending && retry.variables?.videoId === run.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CountChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "emerald" | "red" | "blue";
}) {
  const cls = {
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    red: "bg-red-500/10 text-red-700 dark:text-red-400",
    blue: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        cls,
      )}
    >
      <span className="bg-current h-1.5 w-1.5 rounded-full" />
      {value} {label}
    </span>
  );
}

interface RunSummary {
  id: string;
  status: "UPLOADING" | "PROCESSING" | "READY" | "FAILED";
  progress: number;
  progressStep: string | null;
  duration: number | null;
  errorMessage: string | null;
  processStartedAt: Date | string | null;
  processEndedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  hlsPlaylistUrl: string | null;
  thumbnailUrl: string | null;
  class: {
    id: string;
    title: string;
    courseId: string | null;
    course: { title: string } | null;
  }[];
}

function RunRow({
  run,
  onRetry,
  isRetrying,
}: {
  run: RunSummary;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  const meta = STATUS_META[run.status];
  const cls = run.class[0];
  const showProgress =
    run.status === "PROCESSING" || run.status === "UPLOADING";

  return (
    <div className="hover:bg-muted/30 flex items-start gap-3 px-3 py-3 transition-colors sm:items-center sm:px-4">
      {/* Thumbnail or status disc */}
      <div
        className={cn(
          "relative flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md sm:h-11 sm:w-16",
          meta.pill,
        )}
      >
        {run.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={run.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            <meta.Icon className="h-4 w-4" />
            {showProgress && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent"
                style={{
                  animation: "tutly-shimmer 2s linear infinite",
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Title + dot-separated meta */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <p className="text-foreground truncate text-sm font-medium">
            {cls?.title ?? "Unlinked video"}
          </p>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              meta.pill,
            )}
          >
            <meta.Icon className="h-2.5 w-2.5" />
            {meta.label}
          </span>
        </div>

        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center text-[11px]">
          {cls?.course?.title && (
            <>
              <span className="truncate">{cls.course.title}</span>
              <Dot />
            </>
          )}
          {run.status === "READY" && run.duration ? (
            <>
              <span className="font-mono">
                {formatDurationSeconds(run.duration)}
              </span>
              <Dot />
            </>
          ) : null}
          <span>
            {run.status === "READY" || run.status === "FAILED"
              ? `Finished ${dayjs(run.processEndedAt ?? run.updatedAt).fromNow()}`
              : run.processStartedAt
                ? `Started ${dayjs(run.processStartedAt).fromNow()}`
                : `Created ${dayjs(run.createdAt).fromNow()}`}
          </span>
        </div>

        {showProgress && (
          <div className="mt-2 max-w-md">
            <div className="bg-muted/70 h-1 w-full overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full transition-[width] duration-700 ease-out",
                  run.status === "PROCESSING"
                    ? "bg-amber-500"
                    : "bg-blue-500",
                )}
                style={{ width: `${run.progress}%` }}
              />
            </div>
            <p className="text-muted-foreground mt-1 flex items-center justify-between font-mono text-[10px]">
              <span>{run.progressStep ?? "Preparing…"}</span>
              <span className="tabular-nums">
                {run.progress}%
                {run.processStartedAt && (
                  <>
                    {" · "}
                    <ElapsedSince date={run.processStartedAt} />
                  </>
                )}
              </span>
            </p>
          </div>
        )}

        {run.status === "FAILED" && run.errorMessage && (
          <div className="bg-destructive/5 text-destructive mt-2 flex items-start gap-2 rounded-md border border-red-500/20 p-2 text-[11px]">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="break-words">{run.errorMessage}</span>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes tutly-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      {/* Action column */}
      <div className="flex shrink-0 items-center gap-1 self-start sm:self-center">
        {(run.status === "FAILED" || run.status === "PROCESSING") && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="h-8 rounded-full px-3 text-xs"
            title={
              run.status === "FAILED"
                ? "Retry processing"
                : "Force re-enqueue"
            }
          >
            {isRetrying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            <span className="ml-1.5 hidden sm:inline">
              {run.status === "FAILED" ? "Retry" : "Re-run"}
            </span>
          </Button>
        )}
        {cls && cls.courseId && (
          <Link
            href={`/courses/class?id=${cls.courseId}&classId=${cls.id}`}
            title="Open class"
            className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-muted-foreground/40 mx-2 select-none">
      ·
    </span>
  );
}

function ElapsedSince({ date }: { date: Date | string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const start = typeof date === "string" ? new Date(date).getTime() : date.getTime();
  return (
    <span className="inline-flex items-center gap-1">
      <Clock className="h-2.5 w-2.5" />
      {formatDurationSeconds(Math.max(0, Math.floor((now - start) / 1000)))}
    </span>
  );
}
