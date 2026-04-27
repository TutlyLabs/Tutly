"use client";

import { useAuthSession } from "@/components/auth/ProtectedShell";
import { GridSkeleton, PageHeaderSkeleton } from "@/components/loader/Skeletons";
import { PullToRefresh } from "@/components/native/PullToRefresh";
import { api } from "@/trpc/react";
import CoursesPageClient from "./_components/CoursesPageClient";

export default function CoursesPage() {
  const { user } = useAuthSession();
  const q = api.courses.getEnrolledCourses.useQuery();

  if (!user || q.isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <PageHeaderSkeleton />
        <GridSkeleton count={8} />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={() => q.refetch()}>
      <CoursesPageClient user={user} coursesData={q.data} />
    </PullToRefresh>
  );
}
