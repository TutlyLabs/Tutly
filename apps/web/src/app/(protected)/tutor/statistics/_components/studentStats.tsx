"use client";

import { FaRankingStar } from "react-icons/fa6";
import { api } from "@/trpc/react";

import CalendarHeatmap from "./heatmap";
import { Radialchart } from "./radialchart";
import { StudentBarchart } from "./studentBarchart";

interface AttendanceData {
  attendanceDates: string[];
  classes: string[];
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
    return null;
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
    <div className="mx-4 flex flex-col gap-4 md:mx-8 md:gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        <div className="w-full rounded-xl shadow-xl shadow-blue-500/5 md:w-1/3">
          <Radialchart
            data={attendancePercentage}
            thisWeek={Number(attendancePercentage) - Number(uptoLastWeek)}
          />
        </div>
        <div className="flex w-full flex-col gap-4 rounded-xl shadow-xl shadow-blue-500/5 md:w-3/4 md:flex-row md:gap-2">
          <div className="flex w-full flex-col justify-between text-gray-500 md:w-1/2 md:px-14 md:py-10">
            <div className="relative mb-4 rounded-xl border p-4 md:mb-0">
              <h1 className="bg-background absolute -top-3 px-1 text-sm">
                # Rank
              </h1>
              <div className="flex items-center justify-between">
                <h1 className="text-primary-500 text-3xl font-bold md:text-4xl">
                  NA
                </h1>
                <h1>
                  <FaRankingStar className="text-3xl md:text-4xl" />
                </h1>
              </div>
            </div>
            <div className="relative rounded-xl border p-4">
              <h1 className="bg-background absolute -top-3 px-1 text-sm">
                Score
              </h1>
              <h1 className="text-primary-500 text-3xl font-bold md:text-4xl">
                {studentData.totalPoints}
              </h1>
              <h1 className="text-xs text-gray-500 md:text-sm">
                / {studentData.evaluated} assignments{" "}
              </h1>
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
      <div className="rounded-xl shadow-xl shadow-blue-500/5">
        <CalendarHeatmap
          classes={typedAttendanceData.classes}
          data={typedAttendanceData.attendanceDates}
        />
      </div>
    </div>
  );
}

export default StudentStats;
