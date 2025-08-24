import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import Report from "./_components/Report";

interface CourseReportPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function CourseReportPage({
  params,
}: CourseReportPageProps) {
  const { courseId } = await params;

  const reportData = await api.report.getReportPageData({
    courseId,
  });

  if (reportData?.success === false) {
    if (reportData.redirectTo) {
      redirect(reportData.redirectTo);
    } else {
      redirect("/404");
    }
  }

  if (!reportData?.success || !reportData.data) {
    return <div>No report data found!</div>;
  }

  const { courseId: id, courses, isMentor } = reportData.data;

  return <Report isMentor={isMentor} allCourses={courses} courseId={id} />;
}
