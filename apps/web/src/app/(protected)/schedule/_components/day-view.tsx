import { endOfDay, format, startOfDay } from "date-fns";

interface Event {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  link: string;
  type: string;
}

interface DayViewProps {
  selectedDate: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
}

export function DayView({ selectedDate, events, onEventClick }: DayViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const splitEventForDay = (event: Event, date: Date) => {
    const dayStart = startOfDay(date).getTime();
    const dayEnd = endOfDay(date).getTime();

    const eventStart = event.startDate.getTime();
    const eventEnd = event.endDate.getTime();
    const segmentStart = new Date(Math.max(dayStart, eventStart));
    const segmentEnd = new Date(Math.min(dayEnd, eventEnd));

    return {
      ...event,
      startDate: segmentStart,
      endDate: segmentEnd,
    };
  };

  const getEventsForDay = () => {
    return events
      .filter(
        (event) =>
          event.startDate <= endOfDay(selectedDate) &&
          event.endDate >= startOfDay(selectedDate),
      )
      .map((event) => splitEventForDay(event, selectedDate));
  };

  const dayEvents = getEventsForDay();

  return (
    <div className="h-full">
      <div className="text-foreground mb-4 px-4 pt-4 text-base font-semibold tracking-tight sm:text-xl">
        {format(selectedDate, "EEEE, d MMMM yyyy")}
      </div>
      <div className="relative min-h-full">
        {hours.map((hour) => (
          <div key={hour} className="relative h-[60px]">
            <div className="absolute m-2 flex w-full border-t">
              <div className="text-muted-foreground sticky left-0 -mt-2.5 w-[68px] shrink-0 whitespace-nowrap pr-2 text-right text-xs sm:w-[72px] sm:text-sm">
                {`${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`}
              </div>
              <div className="relative h-[60px] min-w-0 flex-1 p-2">
                <div className="flex flex-row gap-2">
                  {dayEvents.map((event, index) => {
                    return (
                      hour >= event.startDate.getHours() &&
                      hour <= event.endDate.getHours() && (
                        <button
                          key={index}
                          type="button"
                          className="bg-primary text-primary-foreground hover:bg-primary/90 ml-2 inline-flex cursor-pointer items-center rounded-md px-2.5 py-1.5 text-xs font-medium shadow-sm transition-colors sm:ml-4"
                          onClick={() => onEventClick(event)}
                        >
                          {event.name}
                        </button>
                      )
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
