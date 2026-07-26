import type { RouterOutputs } from "@/trpc/react";

type ScheduleData = RouterOutputs["schedule"]["getScheduleData"];

export type Event = ScheduleData["events"][number];
export type Holiday = ScheduleData["holidays"][number];
