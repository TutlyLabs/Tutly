"use client";

import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import { Calendar } from "./_components/calendar";
import { EventsSidebar } from "./_components/events";

export default function SchedulePage() {
  const q = api.schedule.getScheduleData.useQuery();
  if (q.isLoading) return <PageLoader />;
  if (!q.data?.success || !q.data.data) {
    return <div>Failed to load schedule data.</div>;
  }
  const { events, isAuthorized, holidays } = q.data.data;
  return (
    <div className="flex h-screen gap-4">
      <div className="flex-shrink-0">
        <EventsSidebar events={events} />
      </div>
      <div className="flex-1 overflow-hidden">
        <Calendar
          events={events}
          isAuthorized={isAuthorized}
          holidays={holidays}
        />
      </div>
    </div>
  );
}
