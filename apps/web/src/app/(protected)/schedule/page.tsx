"use client";

import { api } from "@/trpc/react";
import { Calendar } from "./_components/calendar";
import { EventsSidebar } from "./_components/events";

export default function SchedulePage() {
  const { data: scheduleData, isLoading } =
    api.schedule.getScheduleData.useQuery();

  if (isLoading) {
    return <div>Loading schedule...</div>;
  }

  if (!scheduleData?.success || !scheduleData.data) {
    return <div>Failed to load schedule data.</div>;
  }

  const { events, isAuthorized, holidays } = scheduleData.data;

  return (
    <div className="bg-background h-full">
      <div className="gap-2 md:flex">
        <div className="md:fixed">
          <EventsSidebar events={events} />
        </div>
        <div className="md:ml-[270px] md:flex-1">
          <Calendar
            events={events}
            isAuthorized={isAuthorized}
            holidays={holidays}
          />
        </div>
      </div>
    </div>
  );
}
