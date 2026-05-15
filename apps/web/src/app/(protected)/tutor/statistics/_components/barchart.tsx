"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@tutly/ui/card";
import type { ChartConfig } from "@tutly/ui/chart";
import { ChartContainer, ChartTooltip } from "@tutly/ui/chart";
import { InboxIcon } from "lucide-react";

const chartConfig = {
  evaluated: { label: "Evaluated", color: "var(--color-chart-2)" },
  pending: { label: "Pending review", color: "var(--color-chart-3)" },
  notSubmitted: { label: "Not submitted", color: "var(--color-chart-5)" },
} satisfies ChartConfig;

export function Barchart({
  courseId,
  mentorUsername,
}: {
  courseId: string;
  mentorUsername?: string;
}) {
  const { data, isLoading } = api.statistics.getBarchartData.useQuery({
    courseId,
    mentorUsername,
  });

  if (isLoading || !data || Array.isArray(data) === false) {
    return null;
  }

  if (data.length === 0) {
    return (
      <Card className="h-[300px] w-full shadow-sm">
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[250px] w-full items-center justify-center">
          <div className="text-muted-foreground text-center">
            <InboxIcon className="mx-auto mb-2 h-8 w-8" />
            <p>No submission data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[300px] w-full shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Submissions</CardTitle>
        <div className="text-muted-foreground flex items-center gap-3 text-[10px]">
          <LegendDot color="var(--color-chart-2)" label="Evaluated" />
          <LegendDot color="var(--color-chart-3)" label="Pending" />
          <LegendDot color="var(--color-chart-5)" label="Not submitted" />
        </div>
      </CardHeader>
      <CardContent className="h-[230px] w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="assignment"
              tickLine={false}
              tickMargin={8}
              axisLine={false}
              fontSize={11}
              interval={0}
              tickFormatter={(v: string) =>
                v.length > 12 ? v.slice(0, 11) + "…" : v
              }
            />
            <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} />
            <ChartTooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              content={<BarTooltip />}
            />
            <Bar
              dataKey="evaluated"
              stackId="s"
              fill="var(--color-chart-2)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="pending"
              stackId="s"
              fill="var(--color-chart-3)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="notSubmitted"
              stackId="s"
              fill="var(--color-chart-5)"
              radius={[4, 4, 0, 0]}
              fillOpacity={0.35}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function BarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as {
    assignment: string;
    submissions: number;
    evaluated: number;
    pending: number;
    notSubmitted: number;
    totalEligible: number;
    overdue: boolean;
    dueDate: string | null;
  };
  const submitRate = d.totalEligible
    ? Math.round((d.submissions / d.totalEligible) * 100)
    : 0;
  const evalRate = d.submissions
    ? Math.round((d.evaluated / d.submissions) * 100)
    : 0;
  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
      <div className="text-foreground font-semibold">{d.assignment}</div>
      {d.dueDate && (
        <div
          className={
            d.overdue ? "mt-0.5 text-rose-500" : "text-muted-foreground mt-0.5"
          }
        >
          Due {new Date(d.dueDate).toLocaleDateString()}
          {d.overdue && " · overdue"}
        </div>
      )}
      <div className="mt-2 space-y-1">
        <Row
          color="var(--color-chart-2)"
          label="Evaluated"
          value={d.evaluated}
        />
        <Row color="var(--color-chart-3)" label="Pending" value={d.pending} />
        <Row
          color="var(--color-chart-5)"
          label="Not submitted"
          value={d.notSubmitted}
        />
      </div>
      <div className="text-muted-foreground mt-2 border-t pt-1.5 text-[11px]">
        {d.submissions}/{d.totalEligible} submitted ({submitRate}%) · {evalRate}
        % reviewed
      </div>
    </div>
  );
}

function Row({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground inline-flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-sm"
          style={{ backgroundColor: color }}
        />
        {label}
      </span>
      <span className="text-foreground font-medium tabular-nums">{value}</span>
    </div>
  );
}
