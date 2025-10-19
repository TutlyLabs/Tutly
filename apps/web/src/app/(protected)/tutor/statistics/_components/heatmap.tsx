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
import Link from "next/link";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CalendarHeatmapProps {
  classes: string[];
  data: string[];
  classesNoAttendance?: string[];
  attendanceDetails?: Record<
    string,
    { duration: number | null; classId: string; title: string }
  >;
  classDetails?: Record<string, { classId: string; title: string }>;
  courseId: string;
}

const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  classes,
  data,
  classesNoAttendance = [],
  attendanceDetails = {},
  classDetails = {},
  courseId,
}) => {
  const [currentYear, setCurrentYear] = useState(startOfToday().getFullYear());
  const [openPopover, setOpenPopover] = useState<string | null>(null);

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
        isNoAttendance: classesNoAttendance.includes(dateStr),
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

  const getCellColor = (
    isPresent: boolean,
    isInClass: boolean,
    isNoAttendance: boolean,
  ) => {
    if (isNoAttendance) return "bg-gray-500";
    if (!isInClass) return "bg-gray-900";
    return isPresent ? "bg-[#2EB88A]" : "bg-[#E23670]";
  };

  return (
    <Card className="flex flex-col items-center p-2 px-4">
      <div className="mb-4 flex w-full items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="font-semibold">Attendance Heatmap</div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm bg-[#2EB88A]"></div>
              <span>Present</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm bg-[#E23670]"></div>
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm bg-gray-500"></div>
              <span>Not Marked</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm bg-gray-900"></div>
              <span>No Class</span>
            </div>
          </div>
        </div>
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

            const { date, isPresent, isInClass, isNoAttendance } = dateInfo;
            const cellColor = getCellColor(
              isPresent,
              isInClass,
              isNoAttendance,
            );
            const dateStr = format(date, "yyyy-MM-dd");
            const attendanceInfo = attendanceDetails[dateStr];
            const classInfo = classDetails[dateStr];

            // Only show popover for dates with class info
            if (!classInfo && !isInClass && !isNoAttendance) {
              return (
                <div
                  key={dateStr}
                  className={`h-3.5 w-3.5 rounded-sm ${cellColor}`}
                />
              );
            }

            return (
              <Popover
                key={dateStr}
                open={openPopover === dateStr}
                onOpenChange={(open) => setOpenPopover(open ? dateStr : null)}
              >
                <PopoverTrigger asChild>
                  <div
                    className={`h-3.5 w-3.5 cursor-pointer rounded-sm ${cellColor} transition-all duration-200 hover:scale-110`}
                    onMouseEnter={() => setOpenPopover(dateStr)}
                    onMouseLeave={() => setOpenPopover(null)}
                  />
                </PopoverTrigger>
                <PopoverContent
                  className="max-w-fit min-w-[130px] p-2"
                  side="top"
                  align="center"
                  onMouseEnter={() => setOpenPopover(dateStr)}
                  onMouseLeave={() => setOpenPopover(null)}
                >
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold">
                      {format(date, "MMM dd, yyyy")}
                    </div>
                    {classInfo && (
                      <div className="flex gap-2 text-[11px]">
                        <span>class:</span>

                        <Link
                          href={`/courses/${courseId}/classes/${classInfo.classId}`}
                          target="_blank"
                          className="block truncate text-[11px] text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {classInfo.title}
                        </Link>
                      </div>
                    )}
                    <div className="text-[11px]">
                      <span className="font-medium">Status: </span>
                      <span
                        className={
                          isNoAttendance
                            ? "text-gray-600 dark:text-gray-400"
                            : isInClass
                              ? isPresent
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                              : "text-gray-600 dark:text-gray-400"
                        }
                      >
                        {isNoAttendance
                          ? "Not Marked"
                          : isInClass
                            ? isPresent
                              ? "Present"
                              : "Absent"
                            : "No Class"}
                      </span>
                    </div>
                    {attendanceInfo?.duration && (
                      <div className="text-muted-foreground text-[11px]">
                        Duration: {attendanceInfo.duration} min
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default CalendarHeatmap;
