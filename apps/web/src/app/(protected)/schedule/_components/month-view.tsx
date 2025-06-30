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

  return (
    <div className="h-full p-4">
      <div className="grid grid-cols-7 gap-px">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
          <div
            key={dayName}
            className="text-muted-foreground h-8 text-center text-sm font-medium"
          >
            {dayName}
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
                className={`border-border flex h-[90px] flex-col items-start border p-2 md:h-[120px] ${
                  isCurrentMonth ? "bg-background" : "bg-muted/50"
                }`}
              >
                <div
                  className={`mb-1 text-sm ${
                    isToday
                      ? "flex h-10 w-10 items-center justify-center rounded-full bg-green-600 font-bold"
                      : ""
                  }`}
                >
                  {getDate(day)}
                </div>

                <div className="flex w-full flex-col">
                  {dayEvents.map((event, index) => (
                    <div
                      key={index}
                      className="cursor-pointer overflow-hidden rounded px-2 py-1 text-center text-xs"
                      onClick={() => onEventClick(event)}
                      title={event.name}
                    >
                      {event.type === "Holiday" ? (
                        <div className="ml-auto rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-500">
                          {event.type}
                        </div>
                      ) : event.type === "Assignment" ? (
                        <div className="ml-auto rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                          {event.name}
                        </div>
                      ) : (
                        <div className="ml-auto rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-600">
                          {event.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
