"use client";

import { FaRankingStar } from "react-icons/fa6";
import { api } from "@/trpc/react";

import CalendarHeatmap from "./heatmap";
import { Radialchart } from "./radialchart";
import { StudentBarchart } from "./studentBarchart";

interface AttendanceData {
  attendanceDates: string[];
  classes: string[];
  classesNoAttendance?: string[];
  attendanceDetails?: Record<
    string,
    { duration: number | null; classId: string; title: string }
  >;
  classDetails?: Record<string, { classId: string; title: string }>;
}

function StudentStats({
  courseId,
  studentUsername,
}: {
  courseId: string;
  studentUsername?: string;
}) {
  const { data: studentData, isLoading: studentDataLoading } =
    api.statistics.studentBarchartData.useQuery({
      courseId,
      studentUsername: studentUsername || undefined,
    });

  const { data: attendanceData, isLoading: attendanceDataLoading } =
    api.statistics.studentHeatmapData.useQuery({
      courseId,
      studentUsername: studentUsername || undefined,
    });

  if (
    studentDataLoading ||
    attendanceDataLoading ||
    !studentData ||
    !attendanceData
  ) {
    return (
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          <div className="bg-card h-[300px] w-full animate-pulse rounded-xl border md:w-1/3" />
          <div className="bg-card h-[300px] w-full animate-pulse rounded-xl border md:w-2/3" />
        </div>
        <div className="bg-card h-[400px] w-full animate-pulse rounded-xl border" />
      </div>
    );
  }

  const typedAttendanceData = attendanceData as AttendanceData;

  const attendancePercentage = (
    (typedAttendanceData.attendanceDates.length * 100) /
    typedAttendanceData.classes.length
  ).toFixed(2);

  function isDateInCurrentWeek(dateString: string) {
    const inputDate = new Date(dateString);
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return inputDate >= startOfWeek && inputDate <= endOfWeek;
  }

  const thisWeekAttended = typedAttendanceData.attendanceDates.filter(
    (date: string) => isDateInCurrentWeek(date),
  ).length;
  const thisWeekClasses = typedAttendanceData.classes.filter((date: string) =>
    isDateInCurrentWeek(date),
  ).length;
  const uptoLastWeek =
    typedAttendanceData.classes.length - thisWeekClasses == 0
      ? 0
      : (
          ((typedAttendanceData.attendanceDates.length - thisWeekAttended) *
            100) /
          (typedAttendanceData.classes.length - thisWeekClasses)
        ).toFixed(2);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        <div className="w-full rounded-xl shadow-sm md:w-1/3">
          <Radialchart
            data={attendancePercentage}
            thisWeek={Number(attendancePercentage) - Number(uptoLastWeek)}
          />
        </div>
        <div className="flex w-full flex-col gap-4 md:w-3/4 md:flex-row md:gap-4">
          <div className="bg-card flex w-full flex-col justify-center gap-4 rounded-xl border p-5 shadow-sm md:w-1/2">
            <div className="border-border bg-background/40 rounded-xl border p-4">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                # Rank
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-foreground text-3xl font-semibold tabular-nums md:text-4xl">
                  NA
                </span>
                <FaRankingStar className="text-muted-foreground text-3xl md:text-4xl" />
              </div>
            </div>
            <div className="border-border bg-background/40 rounded-xl border p-4">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Score
              </p>
              <p className="text-foreground mt-2 text-3xl font-semibold tabular-nums md:text-4xl">
                {studentData.totalPoints}
              </p>
              <p className="text-muted-foreground mt-1 text-xs md:text-sm">
                / {studentData.evaluated} assignments
              </p>
            </div>
          </div>
          <div className="md:w-2/3">
            <StudentBarchart
              data={[
                studentData.evaluated,
                studentData.unreviewed,
                studentData.unsubmitted,
              ]}
            />
          </div>
        </div>
      </div>
      <div className="w-full">
        <CalendarHeatmap
          classes={typedAttendanceData.classes}
          data={typedAttendanceData.attendanceDates}
          classesNoAttendance={typedAttendanceData.classesNoAttendance}
          attendanceDetails={typedAttendanceData.attendanceDetails}
          classDetails={typedAttendanceData.classDetails}
          courseId={courseId}
        />
      </div>
    </div>
  );
}

export default StudentStats;
