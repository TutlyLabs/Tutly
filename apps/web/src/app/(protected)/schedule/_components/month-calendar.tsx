import {
  addDays,
  endOfMonth,
  format,
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

interface MonthCalendarProps {
  month: Date;
  today: Date;
  selectedDate: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
  compact?: boolean;
}

export function MonthCalendar({
  month,
  today,
  events,
  onEventClick,
  compact = false,
}: MonthCalendarProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const startDate = startOfWeek(monthStart);

  const weeks = [];
  let days = [];
  let day = startDate;

  while (day <= monthEnd || days.length !== 0) {
    for (let i = 0; i < 7; i++) {
      days.push(day);
      day = addDays(day, 1);
    }
    weeks.push(days);
    days = [];
  }

  // Improved function to get events for a day
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const normalizedDay = new Date(day).setHours(0, 0, 0, 0);
      const eventStart = new Date(event.startDate).setHours(0, 0, 0, 0);
      const eventEnd = new Date(event.endDate).setHours(23, 59, 59, 999);
      return normalizedDay >= eventStart && normalizedDay <= eventEnd;
    });
  };

  return (
    <div className={`${compact ? "text-xs" : "text-sm"}`}>
      <h2
        className={`${compact ? "text-sm" : "text-xl"} text-foreground mb-3 font-semibold`}
      >
        {format(month, "MMMM yyyy")}
      </h2>
      <div className="grid grid-cols-7 gap-px">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName) => (
          <div
            key={dayName}
            className={`${compact ? "h-7" : "h-9"} text-muted-foreground flex items-center justify-center text-center text-[11px] font-medium uppercase tracking-wide`}
          >
            {dayName}
          </div>
        ))}
        {weeks.map((week, weekIndex) =>
          week.map((day, dayIndex) => {
            const isToday = isSameDay(day, today);
            const isCurrentMonth = isSameMonth(day, month);
            const dayEvents = getEventsForDay(day);

            return (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`${compact ? "h-7 w-7" : "h-9 w-9"} relative mx-auto my-0.5 flex flex-col items-center justify-center rounded-full ${
                  isToday
                    ? "bg-primary text-primary-foreground font-semibold"
                    : isCurrentMonth
                      ? "text-foreground"
                      : "text-muted-foreground/50"
                }`}
              >
                <span>{getDate(day)}</span>
                {dayEvents.length > 0 && (
                  <span
                    className={`absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                      isToday ? "bg-primary-foreground" : "bg-primary"
                    }`}
                    title={dayEvents.map((e) => e.name).join(", ")}
                    onClick={() => onEventClick(dayEvents[0]!)}
                  />
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
