"use client";

import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";

import { api } from "@/trpc/react";

type Run = {
  status: string;
  score: number;
  maxScore: number;
  visiblePassed: number;
  visibleTotal: number;
  hiddenPassed: number;
  hiddenTotal: number;
  errorMessage?: string | null;
};

function isTerminal(status: string | undefined): boolean {
  return (
    status === "PASSED" ||
    status === "FAILED" ||
    status === "ERROR" ||
    status === "CANCELLED"
  );
}

function badgeFor(run: Run | undefined) {
  if (!run) {
    return {
      tone: "muted" as const,
      icon: <Clock className="h-3 w-3" />,
      label: "Not run",
    };
  }
  switch (run.status) {
    case "QUEUED":
      return {
        tone: "muted" as const,
        icon: <Clock className="h-3 w-3" />,
        label: "Queued",
      };
    case "RUNNING":
      return {
        tone: "info" as const,
        icon: <Loader2 className="h-3 w-3 animate-spin" />,
        label: "Running",
      };
    case "PASSED":
      return {
        tone: "success" as const,
        icon: <CheckCircle2 className="h-3 w-3" />,
        label: `${run.score}/${run.maxScore}`,
      };
    case "FAILED":
      return {
        tone: "warn" as const,
        icon: <XCircle className="h-3 w-3" />,
        label: `${run.score}/${run.maxScore}`,
      };
    case "ERROR":
      return {
        tone: "danger" as const,
        icon: <AlertTriangle className="h-3 w-3" />,
        label: "Error",
      };
    case "CANCELLED":
      return {
        tone: "muted" as const,
        icon: <XCircle className="h-3 w-3" />,
        label: "Cancelled",
      };
    default:
      return {
        tone: "muted" as const,
        icon: <Clock className="h-3 w-3" />,
        label: run.status,
      };
  }
}

const toneClasses = {
  muted: "bg-muted text-muted-foreground",
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  warn: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  danger: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

export function TestRunStatusBadge({
  submissionId,
  initialRun,
}: {
  submissionId: string;
  initialRun?: Run | null;
}) {
  const query = api.testRuns.getForSubmission.useQuery(
    { submissionId },
    {
      refetchInterval: (q) => {
        const latest = q.state.data?.data?.[0] as Run | undefined;
        return isTerminal(latest?.status) ? false : 3000;
      },
      refetchOnWindowFocus: false,
    },
  );

  const latest =
    (query.data?.data?.[0] as Run | undefined) ?? initialRun ?? undefined;
  const badge = badgeFor(latest);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${toneClasses[badge.tone]}`}
      title={
        latest?.errorMessage
          ? latest.errorMessage
          : latest
            ? `${latest.status} · visible ${latest.visiblePassed}/${latest.visibleTotal} · hidden ${latest.hiddenPassed}/${latest.hiddenTotal}`
            : "No test run yet"
      }
    >
      {badge.icon}
      <span>{badge.label}</span>
    </span>
  );
}
