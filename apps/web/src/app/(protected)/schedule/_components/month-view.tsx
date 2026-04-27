import {
  addDays,
  endOfMonth,
  getDate,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";

interface Event {
  type: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  link: string;
}

interface MonthViewProps {
  selectedDate: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
}

export function MonthView({
  selectedDate,
  events,
  onEventClick,
}: MonthViewProps) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const today = new Date();

  const weeks = [];
  let currentDay = startDate;

  while (currentDay <= monthEnd) {
    const week = Array.from({ length: 7 }, () => {
      const day = currentDay;
      currentDay = addDays(currentDay, 1);
      return day;
    });
    weeks.push(week);
  }

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventStart = new Date(event.startDate).setHours(0, 0, 0, 0);
      const eventEnd = new Date(event.endDate).setHours(23, 59, 59, 999);
      const currentDay = day.setHours(0, 0, 0, 0);
      return currentDay >= eventStart && currentDay <= eventEnd;
    });
  };

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const dayLabelsLong = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="h-full p-2 sm:p-4">
      <div className="grid grid-cols-7 gap-px">
        {dayLabelsLong.map((dayName, i) => (
          <div
            key={dayName + i}
            className="text-muted-foreground h-8 text-center text-[11px] font-medium uppercase tracking-wide sm:text-sm"
          >
            <span className="sm:hidden">{dayLabels[i]}</span>
            <span className="hidden sm:inline">{dayName}</span>
          </div>
        ))}
      </div>

      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 gap-px">
          {week.map((day, dayIndex) => {
            const isToday = isSameDay(day, today);
            const isCurrentMonth = isSameMonth(day, selectedDate);
            const dayEvents = getEventsForDay(day);

            return (
              <div
                key={dayIndex}
                className={`border-border flex h-[64px] flex-col items-start overflow-hidden border p-1 sm:h-[110px] sm:p-2 ${
                  isCurrentMonth
                    ? "bg-background"
                    : "bg-muted/40 text-muted-foreground"
                }`}
              >
                <div
                  className={`mb-0.5 text-xs sm:mb-1 sm:text-sm ${
                    isToday
                      ? "bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full font-semibold sm:h-7 sm:w-7"
                      : "text-foreground"
                  }`}
                >
                  {getDate(day)}
                </div>

                <div className="flex w-full min-w-0 flex-col gap-0.5 sm:gap-1">
                  {dayEvents.slice(0, 2).map((event, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full cursor-pointer overflow-hidden text-left"
                      onClick={() => onEventClick(event)}
                      title={event.name}
                    >
                      {event.type === "Holiday" ? (
                        <span className="block w-full truncate rounded border border-rose-500/30 bg-rose-500/15 px-1 py-0.5 text-[10px] font-medium text-rose-700 dark:text-rose-400 sm:text-[11px]">
                          {event.type}
                        </span>
                      ) : event.type === "Assignment" ? (
                        <span className="bg-primary/10 text-primary border-primary/30 block w-full truncate rounded border px-1 py-0.5 text-[10px] font-medium sm:text-[11px]">
                          {event.name}
                        </span>
                      ) : (
                        <span className="block w-full truncate rounded border border-violet-500/30 bg-violet-500/15 px-1 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-400 sm:text-[11px]">
                          {event.name}
                        </span>
                      )}
                    </button>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-muted-foreground text-[10px]">
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
