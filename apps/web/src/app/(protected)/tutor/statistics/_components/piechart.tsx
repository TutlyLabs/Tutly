"use client";

import { Cell, Label, Pie, PieChart } from "recharts";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartContainer } from "@/components/ui/chart";
import { InboxIcon } from "lucide-react";

const chartConfig = {
  evaluated: {
    label: "Evaluated",
    color: "hsl(var(--chart-1))",
  },
  unreviewed: {
    label: "Unreviewed",
    color: "hsl(var(--chart-3))",
  },
  unsubmitted: {
    label: "Unsubmitted",
    color: "hsl(var(--chart-5))",
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
      <Card className="h-[300px] w-full">
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
    <Card className="h-[300px] w-full">
      <CardHeader>
        <CardTitle>Assignments</CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              label={(entry) => `${entry.name}: ${entry.value}`}
              labelLine={true}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
              <Label
                value={`Total\n${total}`}
                position="center"
                className="text-sm font-medium"
                fill="hsl(var(--foreground))"
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
