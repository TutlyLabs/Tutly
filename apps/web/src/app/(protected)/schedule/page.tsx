import { api } from "@/trpc/server";
import { Calendar } from "./_components/calendar";
import { EventsSidebar } from "./_components/events";

export default async function SchedulePage() {
  const scheduleData = await api.schedule.getScheduleData();

  if (!scheduleData?.success || !scheduleData.data) {
    return <div>Failed to load schedule data.</div>;
  }

  const { events, isAuthorized, holidays } = scheduleData.data;

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
