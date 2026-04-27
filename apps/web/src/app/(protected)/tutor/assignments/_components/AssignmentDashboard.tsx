"use client";

import { Suspense } from "react";
import Link from "next/link";
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

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div>
        <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
          Assignments
        </h1>
        <p className="text-muted-foreground text-sm">
          Browse student submissions across your courses.
        </p>
      </div>
      {courses === null || courses.length === 0 ? (
        <div className="text-center">No courses available!</div>
      ) : (
        <Suspense
          fallback={
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
          }
        >
          <div className="flex justify-end">
            {currentUser.role !== "STUDENT" && (
              <Link
                href="/tutor/assignments/getByAssignment"
                className="cursor-pointer font-bold text-gray-500 italic"
              >
                Get by assignment?
              </Link>
            )}
          </div>
          <MentorAssignmentBoard
            courses={courses}
            students={students as any}
            role={currentUser.role}
            currentUser={currentUser}
          />
        </Suspense>
      )}
    </div>
  );
};

export default AssignmentDashboard;
