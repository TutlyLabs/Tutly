"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Skeleton } from "@tutly/ui/skeleton";

import MentorAssignmentBoard from "./MentorAssignmentBoard";

const AssignmentDashboard = () => {
  const router = useRouter();

  const {
    data: dashboardData,
    isLoading,
    error,
  } = api.assignments.getAssignmentsDashboardData.useQuery();

  if (dashboardData?.success === false) {
    if (dashboardData.redirectTo) {
      router.push(dashboardData.redirectTo);
    } else {
      router.push("/assignments");
    }
    return null;
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="bg-card rounded-xl border shadow-sm">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b p-4 last:border-b-0"
            >
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">Error loading assignments dashboard</div>
    );
  }

  if (!dashboardData?.success || !dashboardData.data) {
    return (
      <div className="text-center">No assignments dashboard data found!</div>
    );
  }

  const { students, courses, currentUser } = dashboardData.data;

  if (!currentUser || !courses || !students) {
    return <div className="text-center">Sign in to view assignments!</div>;
  }

  if (courses === null || courses.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl py-12 text-center font-semibold">
        No courses available!
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-8 w-48" />
          <div className="bg-card rounded-xl border shadow-sm">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="m-3 h-12 w-[calc(100%-1.5rem)]" />
            ))}
          </div>
        </div>
      }
    >
      <MentorAssignmentBoard
        courses={courses}
        students={students as any}
        role={currentUser.role}
        currentUser={currentUser}
      />
    </Suspense>
  );
};

export default AssignmentDashboard;
