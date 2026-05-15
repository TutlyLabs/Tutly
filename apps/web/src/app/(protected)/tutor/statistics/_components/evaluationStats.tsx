"use client";

import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@tutly/ui/card";
import { InboxIcon } from "lucide-react";

export function EvaluationStats({
  courseId,
  mentorUsername,
}: {
  courseId: string;
  mentorUsername?: string;
}) {
  const { data, isLoading } = api.statistics.getPiechartData.useQuery({
    courseId,
    mentorUsername,
  });

  if (isLoading || !data || Array.isArray(data) === false) {
    return null;
  }

  const completed = data[0] || 0;
  const total = (data[0] || 0) + (data[1] || 0);

  if (total === 0) {
    return (
      <Card className="h-full w-full">
        <CardHeader>
          <CardTitle>Evaluation Stats</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[190px] w-full items-center justify-center">
          <div className="text-muted-foreground text-center">
            <InboxIcon className="mx-auto mb-2 h-8 w-8" />
            <p>No evaluation data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const averageScore = total > 0 ? Math.round((completed * 100) / total) : 0;

  return (
    <Card className="h-full w-full shadow-sm">
      <CardHeader>
        <CardTitle>Evaluation Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-muted/40 border-border flex items-center justify-between rounded-lg border px-4 py-3">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Total Submissions
          </span>
          <span className="text-foreground text-xl font-semibold tabular-nums">
            {total}
          </span>
        </div>
        <div className="border-border rounded-lg border px-4 py-3">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Evaluation Rate
            </span>
            <span className="text-foreground text-xl font-semibold tabular-nums">
              {averageScore}%
            </span>
          </div>
          <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-[width] duration-500"
              style={{ width: `${averageScore}%` }}
            />
          </div>
          <p className="text-muted-foreground mt-2 text-[11px]">
            {completed} of {total} submissions evaluated
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
