"use client";

import { Navigate } from "@/components/auth/Navigate";
import NoDataFound from "@/components/NoDataFound";
import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";

export default function StatisticsPage() {
  const q = api.courses.getAllCourses.useQuery();
  if (q.isLoading) return <PageLoader />;
  const first = q.data?.data?.[0];
  if (first) return <Navigate to={`/statistics/detail?id=${first.id}`} />;
  return (
    <div className="flex h-screen items-center justify-center">
      <NoDataFound message="Oops! No enrolled courses found" />
    </div>
  );
}
