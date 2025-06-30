import {
  eachDayOfInterval,
  endOfYear,
  format,
  getDay,
  isSameDay,
  startOfToday,
  startOfYear,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface CalendarHeatmapProps {
  classes: string[];
  data: string[];
}

const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({ classes, data }) => {
  const [currentYear, setCurrentYear] = useState(startOfToday().getFullYear());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  const generateDatesForYear = (year: number) => {
    const startOfYearDate = startOfYear(new Date(year, 0, 1));
    const endOfYearDate = endOfYear(new Date(year, 0, 1));
    const allDays = eachDayOfInterval({
      start: startOfYearDate,
      end: endOfYearDate,
    }).map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      return {
        date,
        isPresent: data.includes(dateStr),
        isInClass: classes.includes(dateStr),
      };
    });
    const paddingDays = getDay(startOfYearDate);
    const paddedDays = [...Array(paddingDays).fill(null), ...allDays];

    return paddedDays;
  };

  const days = generateDatesForYear(currentYear);

  const handlePreviousYear = () => setCurrentYear(currentYear - 1);
  const handleNextYear = () => setCurrentYear(currentYear + 1);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const getCellColor = (isPresent: boolean, isInClass: boolean) => {
    if (!isInClass) return "bg-gray-900";
    return isPresent ? "bg-[#2EB88A]" : "bg-[#E23670]";
  };

  return (
    <Card className="flex flex-col items-center p-2 px-4">
      <div className="mb-4 flex w-full items-center justify-between">
        <div className="font-semibold">Attendance Heatmap</div>
        <div className="flex items-center gap-2">
          <div className="text-lg font-semibold">{currentYear}</div>
          <Button
            onClick={handlePreviousYear}
            className="rounded border p-1 hover:bg-gray-900"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            onClick={handleNextYear}
            className="rounded border p-1 hover:bg-gray-900"
            disabled={currentYear === startOfToday().getFullYear()}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="relative my-2 w-full max-w-5xl">
        {/* months */}
        <div className="ms-16 mb-2 grid grid-cols-12 gap-1">
          {months.map((month) => (
            <div key={month} className="text-xs font-medium text-gray-500">
              {month}
            </div>
          ))}
        </div>

        <div className="grid grid-flow-col grid-rows-7">
          {/* days */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="w-14 text-sm font-medium text-gray-500">
              {day.toLowerCase()}
            </div>
          ))}

          {days.map((dateInfo, index) => {
            if (!dateInfo) {
              return <div key={`empty-${index}`} className="h-3.5 w-3.5" />;
            }

            const { date, isPresent, isInClass } = dateInfo;
            const cellColor = getCellColor(isPresent, isInClass);

            return (
              <div
                key={format(date, "yyyy-MM-dd")}
                className={`h-3.5 w-3.5 cursor-pointer rounded-sm ${cellColor} transition-all duration-200 hover:scale-110`}
                onMouseEnter={() => setHoveredDate(date)}
                onMouseLeave={() => setHoveredDate(null)}
              >
                {hoveredDate && isSameDay(hoveredDate, date) && (
                  <div className="absolute right-0 bottom-10 z-50 w-[100px] rounded border bg-black px-2 py-1 text-xs text-white">
                    <div>{format(date, "MMM dd, yyyy")}</div>
                    <div>
                      {isInClass
                        ? isPresent
                          ? "Present"
                          : "Absent"
                        : "No Class"}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default CalendarHeatmap;
