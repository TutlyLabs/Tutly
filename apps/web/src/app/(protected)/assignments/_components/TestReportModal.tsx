"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Lock,
  Eye,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@tutly/ui/dialog";
import { Button } from "@tutly/ui/button";

import { api } from "@/trpc/react";

type Result = {
  testCaseId?: string;
  title: string;
  visibility?: "VISIBLE" | "HIDDEN";
  passed: boolean;
  durationMs?: number;
  error?: string;
  output?: string;
};

type Tab = "all" | "visible" | "hidden";

export function TestReportModal({
  submissionId,
  open,
  onOpenChange,
}: {
  submissionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const query = api.testRuns.getForSubmission.useQuery(
    { submissionId: submissionId ?? "" },
    { enabled: open && Boolean(submissionId) },
  );

  const run = query.data?.data?.[0];
  const summary = (run?.outputSummary ?? {}) as { results?: Result[] };
  const results = summary.results ?? [];

  const filtered = useMemo(() => {
    if (tab === "visible")
      return results.filter((r) => r.visibility !== "HIDDEN");
    if (tab === "hidden")
      return results.filter((r) => r.visibility === "HIDDEN");
    return results;
  }, [results, tab]);

  const counts = useMemo(() => {
    return {
      all: results.length,
      visible: results.filter((r) => r.visibility !== "HIDDEN").length,
      hidden: results.filter((r) => r.visibility === "HIDDEN").length,
    };
  }, [results]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] min-w-[60vw] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Test report</DialogTitle>
          <DialogDescription>
            {run ? (
              <>
                <span className="font-medium">{run.status}</span> · {run.score}/
                {run.maxScore} · visible {run.visiblePassed}/{run.visibleTotal}{" "}
                · hidden {run.hiddenPassed}/{run.hiddenTotal}
                {run.errorMessage ? (
                  <span className="text-rose-700 dark:text-rose-400">
                    {" "}
                    · {run.errorMessage}
                  </span>
                ) : null}
              </>
            ) : (
              "No test run yet for this submission."
            )}
          </DialogDescription>
        </DialogHeader>

        {results.length > 0 && (
          <div className="flex items-center gap-1 border-b pb-2">
            <TabButton active={tab === "all"} onClick={() => setTab("all")}>
              All ({counts.all})
            </TabButton>
            <TabButton
              active={tab === "visible"}
              onClick={() => setTab("visible")}
            >
              <Eye className="h-3 w-3" />
              Visible ({counts.visible})
            </TabButton>
            <TabButton
              active={tab === "hidden"}
              onClick={() => setTab("hidden")}
            >
              <Lock className="h-3 w-3" />
              Hidden ({counts.hidden})
            </TabButton>
          </div>
        )}

        <ul className="space-y-1 text-sm">
          {filtered.length === 0 && results.length === 0 && (
            <li className="text-muted-foreground py-6 text-center">
              No tests reported.
            </li>
          )}
          {filtered.map((result, idx) => (
            <li
              key={`${result.title}-${idx}`}
              className="border-border/60 bg-card rounded border"
            >
              <button
                type="button"
                onClick={() =>
                  setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }))
                }
                className="hover:bg-muted/40 flex w-full items-center gap-2 px-3 py-1.5 text-left"
              >
                {result.error || result.output ? (
                  expanded[idx] ? (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  )
                ) : (
                  <span className="w-3" />
                )}
                {result.passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                )}
                <span className="flex-1 truncate">{result.title}</span>
                {result.visibility === "HIDDEN" && (
                  <Lock className="text-muted-foreground h-3 w-3 shrink-0" />
                )}
                {typeof result.durationMs === "number" && (
                  <span className="text-muted-foreground text-[10px] tabular-nums">
                    {result.durationMs}ms
                  </span>
                )}
              </button>
              {expanded[idx] && (result.error || result.output) && (
                <pre className="border-border/60 bg-muted/30 max-h-48 overflow-auto border-t px-3 py-2 text-[11px] whitespace-pre-wrap">
                  {result.error || result.output}
                </pre>
              )}
            </li>
          ))}
        </ul>

        <div className="flex justify-end pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
        active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}
