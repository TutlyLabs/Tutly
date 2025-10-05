"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { InboxIcon } from "lucide-react";

const chartConfig = {
  submissions: {
    label: "Submissions",
    color: "var(--color-chart-1)",
  },
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
      <Card className="h-[300px] w-full">
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
    <Card className="h-[300px] w-full">
      <CardHeader>
        <CardTitle>Submissions</CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart
            accessibilityLayer
            data={data}
            margin={{
              top: 20,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="assignment"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar
              dataKey="submissions"
              fill="var(--color-submissions)"
              radius={[8, 8, 0, 0]}
            >
              <LabelList
                position="top"
                offset={12}
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
