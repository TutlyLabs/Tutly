"use client";

import { Navigate } from "@/components/auth/Navigate";
import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";

export default function ReportPage() {
  const q = api.courses.checkUserEnrolledCourses.useQuery();
  if (q.isLoading) return <PageLoader />;
  if (!q.data.success || !q.data.data?.hasEnrolledCourses) {
    return <Navigate to="/instructor/no-courses" />;
  }
  return <Navigate to="/tutor/report/detail?id=all" />;
}
