"use client";

import { Lock } from "lucide-react";

import day from "dayjs";

export function DeadlineLockedBanner({
  dueDate,
}: {
  dueDate: Date | string | null | undefined;
}) {
  if (!dueDate) return null;
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  if (Number.isNaN(due.getTime())) return null;
  if (Date.now() > due.getTime()) return null;

  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>
        <div className="font-medium">
          Detailed results are locked until the deadline
        </div>
        <div className="text-amber-700/80 dark:text-amber-200/70">
          Specific test failures unlock {day(due).format("MMM D, h:mm A")}.
          Until then you can see how many tests passed but not which ones.
        </div>
      </div>
    </div>
  );
}
