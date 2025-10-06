"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export default function Component({
  notSubmitted,
  submitted,
}: {
  notSubmitted: number;
  submitted: number;
}) {
  const chartData = [
    {
      status: "Successfully Submitted",
      assignments: submitted,
      fill: "var(--color-chart-1)",
    },
    {
      status: "Not submitted",
      assignments: notSubmitted,
      fill: "var(--color-chart-3)",
    },
  ];

  const chartConfig = {
    assignments: {
      label: "Assignments",
    },
    submitted: {
      label: "Successfully Submitted",
      color: "var(--color-chart-2)",
    },
    notSubmitted: {
      label: "Not submitted",
      color: "var(--color-chart-3)",
    },
  } satisfies ChartConfig;

  const totalAssignments = React.useMemo(() => {
    return submitted + notSubmitted;
  }, [submitted, notSubmitted]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Assignment Status Overview</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Pie
              data={chartData}
              dataKey="assignments"
              nameKey="status"
              innerRadius={60}
              outerRadius={80}
              strokeWidth={5}
              paddingAngle={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {totalAssignments}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 24}
                          className="fill-muted-foreground text-sm"
                        >
                          Total
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
