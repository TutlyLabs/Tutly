"use client";

import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import AttendanceClient from "./_components/Attendancefilters";

export default function AttendancePage() {
  const q = api.attendances.getAttendancePageData.useQuery();
  if (q.isLoading) return <PageLoader />;
  if (!q.data?.success || !q.data.data) {
    return <div>No attendance data found!</div>;
  }
  const { courses, role } = q.data.data;
  return (
    <div>
      <AttendanceClient courses={courses} role={role} />
    </div>
  );
}
