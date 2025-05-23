import { TrendingUp } from "lucide-react";
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { InboxIcon } from "lucide-react";

const chartConfig = {
  present: {
    label: "Present",
    color: "hsl(var(--chart-1))",
  },
  absent: {
    label: "Absent",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

export function Radialchart({ data, thisWeek }: any) {
  if (!data || data === "0") {
    return (
      <Card className="h-[300px] w-full">
        <CardHeader>
          <CardTitle>Attendance</CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] w-full flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <InboxIcon className="mx-auto h-8 w-8 mb-2" />
            <p>No attendance data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = [{ present: data, absent: (100 - data).toFixed(2) }];
  return (
    <Card className="h-[300px] w-full">
      <CardHeader className="text-center pb-10">
        <CardTitle>Attendance</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center pb-0 relative h-[250px]">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <RadialBarChart data={chartData} endAngle={180} innerRadius={80} outerRadius={150}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 18}
                          className="fill-foreground text-2xl font-bold"
                        >
                          {chartData[0]?.present ?? 0}
                        </tspan>
                        <tspan x={viewBox.cx} y={viewBox.cy || 0} className="fill-muted-foreground">
                          percentage
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
            <RadialBar
              dataKey="present"
              stackId="a"
              cornerRadius={5}
              fill="var(--color-present)"
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="absent"
              fill="var(--color-absent)"
              stackId="a"
              cornerRadius={5}
              className="stroke-transparent stroke-2"
            />
          </RadialBarChart>
        </ChartContainer>
        <CardFooter className="text-sm m-auto absolute bottom-0">
          This week &nbsp; <TrendingUp className="mr-2 h-4 w-4" />{" "}
          <span className={`${thisWeek < 0 ? "text-red-500" : "text-green-500"}`}>{thisWeek}%</span>
        </CardFooter>
      </CardContent>
    </Card>
  );
}
