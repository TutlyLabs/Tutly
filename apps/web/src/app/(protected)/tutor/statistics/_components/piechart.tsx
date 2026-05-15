"use client";

import { Cell, Label, Pie, PieChart } from "recharts";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@tutly/ui/card";
import type { ChartConfig } from "@tutly/ui/chart";
import { ChartContainer } from "@tutly/ui/chart";
import { InboxIcon } from "lucide-react";

const chartConfig = {
  evaluated: {
    label: "Evaluated",
    color: "var(--color-chart-1)",
  },
  unreviewed: {
    label: "Unreviewed",
    color: "var(--color-chart-3)",
  },
  unsubmitted: {
    label: "Unsubmitted",
    color: "var(--color-chart-5)",
  },
} satisfies ChartConfig;

const COLORS = [
  "var(--color-evaluated)",
  "var(--color-unreviewed)",
  "var(--color-unsubmitted)",
];
const LABELS = ["Evaluated", "Unreviewed", "Unsubmitted"];

export function Piechart({
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

  const chartData = [
    { name: "Evaluated", value: data[0] || 0 },
    { name: "Unreviewed", value: data[1] || 0 },
    { name: "Unsubmitted", value: data[2] || 0 },
  ];

  const total = chartData.reduce((sum, entry) => sum + entry.value, 0);

  if (total === 0) {
    return (
      <Card className="h-[300px] w-full shadow-sm">
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[250px] w-full items-center justify-center">
          <div className="text-muted-foreground text-center">
            <InboxIcon className="mx-auto mb-2 h-8 w-8" />
            <p>No assignment data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[300px] w-full shadow-sm">
      <CardHeader>
        <CardTitle>Assignments</CardTitle>
      </CardHeader>
      <CardContent className="flex h-[250px] w-full flex-col gap-2">
        <ChartContainer config={chartConfig} className="h-[170px] w-full">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={2}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
              <Label
                value={total.toString()}
                position="center"
                dy={-6}
                className="fill-foreground text-xl font-semibold"
              />
              <Label
                value="Total"
                position="center"
                dy={12}
                className="fill-muted-foreground text-[10px] tracking-wide uppercase"
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px]">
          {chartData.map((entry, index) => (
            <div
              key={entry.name}
              className="text-muted-foreground inline-flex items-center gap-1.5"
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: COLORS[index] }}
              />
              <span className="text-foreground/80">{entry.name}</span>
              <span className="tabular-nums">{entry.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
