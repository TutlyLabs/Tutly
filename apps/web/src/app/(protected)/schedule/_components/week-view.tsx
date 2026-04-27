"use client";

import {
  addDays,
  endOfDay,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
} from "date-fns";

interface Event {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  link: string;
  type: string;
}
interface WeekViewProps {
  selectedDate: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
}

export function WeekView({
  selectedDate,
  events,
  onEventClick,
}: WeekViewProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const today = new Date();

  const splitEventForDay = (event: Event, day: Date) => {
    const dayStart = startOfDay(day).getTime();
    const dayEnd = endOfDay(day).getTime();

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

  const getEventsForDay = (day: Date) => {
    return events
      .filter(
        (event) =>
          event.startDate <= endOfDay(day) && event.endDate >= startOfDay(day),
      )
      .map((event) => splitEventForDay(event, day));
  };

  const getEventsLayout = (dayEvents: Event[]) => {
    const columns: Event[][] = [];

    dayEvents.forEach((event) => {
      let placed = false;
      for (const column of columns) {
        if (!column.some((e) => e.endDate > event.startDate)) {
          column.push(event);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([event]);
      }
    });

    return dayEvents.map((event) => {
      const columnIndex = columns.findIndex((column) => column.includes(event));
      const totalColumns = columns.length;
      return {
        left: (columnIndex / totalColumns) * 100,
        width: 100 / totalColumns,
      };
    });
  };

  const getEventStyle = (
    event: Event,
    layout: { left: number; width: number },
  ) => {
    const startMinutes =
      event.startDate.getHours() * 60 + event.startDate.getMinutes();
    const endMinutes =
      event.endDate.getHours() * 60 + event.endDate.getMinutes();
    const duration = endMinutes - startMinutes;

    return {
      top: `${startMinutes}px`,
      height: `${duration}px`,
      left: `${layout.left}%`,
      width: `${layout.width}%`,
      position: "absolute" as const,
    };
  };

  return (
    <div className="h-full overflow-auto">
      <div className="bg-background sticky top-0 z-10 border-b">
        <div className="divide-border grid grid-cols-[44px_1fr] divide-x sm:grid-cols-[60px_1fr]">
          <div className="h-12"></div>
          <div className="divide-border grid grid-cols-7 divide-x">
            {days.map((day) => {
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={day.toString()}
                  className={`flex flex-col items-center justify-center px-1 py-2 text-center ${
                    isToday
                      ? "bg-primary/10 text-primary"
                      : "text-foreground"
                  }`}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wide sm:text-xs">
                    <span className="sm:hidden">{format(day, "EEEEE")}</span>
                    <span className="hidden sm:inline">{format(day, "EEE")}</span>
                  </span>
                  <span
                    className={`mt-0.5 text-sm font-bold sm:text-base ${
                      isToday
                        ? "bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-full"
                        : ""
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="divide-border grid grid-cols-[44px_1fr] divide-x sm:grid-cols-[60px_1fr]">
        <div className="divide-border divide-y">
          {hours.map((hour) => (
            <div
              key={hour}
              className="text-muted-foreground flex h-[60px] items-center justify-end pr-1.5 text-[10px] sm:pr-2 sm:text-sm"
            >
              {format(new Date().setHours(hour, 0, 0, 0), "h a")}
            </div>
          ))}
        </div>
        <div className="divide-border grid grid-cols-7 divide-x">
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const layouts = getEventsLayout(dayEvents);

            return (
              <div
                key={day.toString()}
                className="divide-border relative divide-y"
              >
                {hours.map((hour) => (
                  <div key={hour} className="h-[60px]"></div>
                ))}
                {dayEvents.map((event, index) => {
                  const layout = layouts[index];
                  if (!layout) return null;

                  return (
                    <button
                      key={`${event.name}-${event.startDate.getTime()}`}
                      type="button"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer overflow-hidden rounded-md p-1.5 text-left text-[11px] font-medium break-words whitespace-normal shadow-sm transition-colors"
                      style={getEventStyle(event, layout)}
                      onClick={() => onEventClick(event)}
                    >
                      {event.name}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
