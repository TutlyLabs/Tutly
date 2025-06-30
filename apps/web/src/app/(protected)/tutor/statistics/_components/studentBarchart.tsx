import { TrendingUp } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { InboxIcon } from "lucide-react";

const chartData = [
  { browser: "evaluated", submissions: 275, fill: "var(--color-evaluated)" },
  { browser: "unreviewed", submissions: 200, fill: "var(--color-unreviewed)" },
  {
    browser: "unsubmitted",
    submissions: 187,
    fill: "var(--color-unsubmitted)",
  },
];

const chartConfig = {
  submissions: {
    label: "Submissions",
  },
  evaluated: {
    label: "Evaluated",
    color: "hsl(var(--chart-1))",
  },
  unreviewed: {
    label: "Unreviewed",
    color: "hsl(var(--chart-2))",
  },
  unsubmitted: {
    label: "Unsubmitted",
    color: "hsl(var(--chart-3))",
  },
  edge: {
    label: "Edge",
    color: "hsl(var(--chart-4))",
  },
  other: {
    label: "Other",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

export function StudentBarchart({ data }: any) {
  if (!data || data.every((val: number) => val === 0)) {
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

  chartData.forEach((d, ind) => (d.submissions = data[ind]));
  return (
    <Card className="h-[300px] w-full">
      <CardHeader>
        <CardTitle>Assignments</CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              left: 20,
            }}
          >
            <YAxis
              dataKey="browser"
              type="category"
              tickLine={false}
              tickMargin={5}
              axisLine={false}
              tickFormatter={(value) =>
                chartConfig[value as keyof typeof chartConfig]?.label
              }
            />
            <XAxis dataKey="submissions" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="submissions" layout="vertical" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
