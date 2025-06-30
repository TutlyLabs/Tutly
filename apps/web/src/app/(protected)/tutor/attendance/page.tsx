"use client";

import { api } from "@/trpc/react";
import AttendanceClient from "./_components/Attendancefilters";

export default function AttendancePage() {
  const {
    data: attendanceData,
    isLoading,
    error,
  } = api.attendances.getAttendancePageData.useQuery();

  if (isLoading) {
    return <div>Loading attendance data...</div>;
  }

  if (error) {
    return <div>Error loading attendance data</div>;
  }

  if (!attendanceData?.success || !attendanceData.data) {
    return <div>No attendance data found!</div>;
  }

  const { courses, role } = attendanceData.data;

  return (
    <div>
      <AttendanceClient courses={courses} role={role} />
    </div>
  );
}
