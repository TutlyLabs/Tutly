"use client";

import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="h-full w-full">
      <CardHeader>
        <CardTitle>Evaluation Stats</CardTitle>
      </CardHeader>
      <CardContent className="h-[190px] w-full">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted flex flex-col items-center justify-center rounded-lg p-4">
            <span className="text-2xl font-bold">{total}</span>
            <span className="text-muted-foreground text-sm">
              Total Submissions
            </span>
          </div>
          <div className="bg-muted flex flex-col items-center justify-center rounded-lg p-4">
            <span className="text-2xl font-bold">{averageScore}%</span>
            <span className="text-muted-foreground text-sm">Average Score</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
