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
      <h2 className={`${compact ? "text-sm" : "text-xl"} mb-5 font-semibold`}>
        {format(month, "MMMM yyyy")}
      </h2>
      <div className="grid grid-cols-7 gap-px">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName) => (
          <div
            key={dayName}
            className={`${compact ? "h-8" : "h-10"} text-muted-foreground text-center font-medium`}
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
                className={`${compact ? "h-8" : "h-10"} ${
                  isCurrentMonth ? "bg-background" : "bg-muted/50"
                } ${
                  isToday ? "rounded-full bg-green-600 text-white" : ""
                } relative m-0.5 flex flex-col items-center justify-center`}
              >
                <span>{getDate(day)}</span>
                {dayEvents.length > 0 && (
                  <div className="absolute right-0 bottom-0 left-0 flex justify-center">
                    {dayEvents.map((event, index) => (
                      <div
                        key={index}
                        className="mt-1 h-1 w-4 cursor-pointer rounded-full bg-red-500"
                        title={event.name}
                        onClick={() => onEventClick(event)}
                      ></div>
                    ))}
                  </div>
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
