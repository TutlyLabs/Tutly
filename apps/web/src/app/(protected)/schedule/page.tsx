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
