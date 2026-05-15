"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@tutly/ui/card";
import type { ChartConfig } from "@tutly/ui/chart";
import { ChartContainer, ChartTooltip } from "@tutly/ui/chart";
import { InboxIcon } from "lucide-react";

const chartConfig = {
  attendees: {
    label: "Present",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig;

function AttendanceTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as {
    class: string;
    title?: string;
    attendees: number;
    absentees: number;
    totalEligible: number;
  };
  const rate = d.totalEligible
    ? Math.round((d.attendees / d.totalEligible) * 100)
    : 0;
  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
      {d.title && (
        <div className="text-foreground font-semibold">{d.title}</div>
      )}
      <div className="text-muted-foreground mt-0.5">{d.class}</div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
        <span className="text-muted-foreground">Present</span>
        <span className="text-foreground text-right font-medium tabular-nums">
          {d.attendees}
        </span>
        <span className="text-muted-foreground">Absent</span>
        <span className="text-foreground text-right font-medium tabular-nums">
          {d.absentees}
        </span>
        <span className="text-muted-foreground">Eligible</span>
        <span className="text-foreground text-right font-medium tabular-nums">
          {d.totalEligible}
        </span>
      </div>
      <div className="text-muted-foreground mt-2 border-t pt-1.5 text-[11px]">
        Attendance rate · {rate}%
      </div>
    </div>
  );
}

export function Linechart({
  courseId,
  mentorUsername,
}: {
  courseId: string;
  mentorUsername?: string;
}) {
  const { data, isLoading } = api.statistics.getLinechartData.useQuery({
    courseId,
    mentorUsername,
    menteesCount: 0,
  });

  if (isLoading || !data || Array.isArray(data) === false) {
    return null;
  }

  if (data.length === 0) {
    return (
      <Card className="h-[300px] w-full shadow-sm">
        <CardHeader>
          <CardTitle>Attendance</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[250px] w-full items-center justify-center">
          <div className="text-muted-foreground text-center">
            <InboxIcon className="mx-auto mb-2 h-8 w-8" />
            <p>No attendance data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[300px] w-full shadow-sm">
      <CardHeader>
        <CardTitle>Attendance</CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="class"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              content={<AttendanceTooltip />}
            />
            <Bar
              dataKey="attendees"
              fill="var(--color-attendees)"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            >
              <LabelList
                dataKey="attendees"
                position="top"
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
