import { redirect } from "next/navigation";
import { api } from "@/trpc/server";

export default async function ReportPage() {
  const coursesData = await api.courses.checkUserEnrolledCourses();

  if (!coursesData.success) {
    redirect("/instructor/no-courses");
  }

  if (!coursesData.data?.hasEnrolledCourses) {
    redirect("/instructor/no-courses");
  }

  redirect("/tutor/report/all");
}
