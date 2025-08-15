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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartContainer } from "@/components/ui/chart";
import { InboxIcon } from "lucide-react";

const chartConfig = {
  attendees: {
    label: "Present",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

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
      <Card className="h-[300px] w-full">
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
    <Card className="h-[300px] w-full">
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
            <Bar
              dataKey="attendees"
              fill="var(--color-attendees)"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            >
              <LabelList
                dataKey="attendees"
                position="top"
                fill="hsl(var(--foreground))"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
