"use client";

import { useSearchParams } from "next/navigation";

import { Navigate } from "@/components/auth/Navigate";
import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import Report from "./_components/Report";

export default function CourseReportPage() {
  const courseId = useSearchParams().get("id") ?? "";
  const q = api.report.getReportPageData.useQuery({ courseId });
  if (q.isLoading) return <PageLoader />;
  if (q.data?.success === false) {
    return <Navigate to={q.data.redirectTo ?? "/404"} />;
  }
  if (!q.data?.success || !q.data.data) return <div>No report data found!</div>;
  const { courseId: id, courses, isMentor } = q.data.data;
  return <Report isMentor={isMentor} allCourses={courses} courseId={id} />;
}
