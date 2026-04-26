"use client";

import { useSearchParams } from "next/navigation";

import { Navigate } from "@/components/auth/Navigate";
import NoDataFound from "@/components/NoDataFound";
import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";

export default function StatisticsPage() {
  const sp = useSearchParams();
  const q = api.courses.getAllCourses.useQuery();
  if (q.isLoading) return <PageLoader />;
  const first = q.data?.data?.[0];
  if (first) {
    const params = new URLSearchParams(sp);
    params.set("id", first.id);
    return <Navigate to={`/tutor/statistics/detail?${params.toString()}`} />;
  }
  return (
    <div className="flex h-screen items-center justify-center">
      <NoDataFound message="No enrolled courses found" />
    </div>
  );
}
