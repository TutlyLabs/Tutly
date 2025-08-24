import { api } from "@/trpc/server";
import AttendanceClient from "./_components/Attendancefilters";

export default async function AttendancePage() {
  const attendanceData = await api.attendances.getAttendancePageData();

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
