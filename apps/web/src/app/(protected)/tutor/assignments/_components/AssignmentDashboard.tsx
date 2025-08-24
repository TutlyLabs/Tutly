"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";

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
      <div className="mx-2 flex flex-col gap-4 px-2 py-2 md:mx-14 md:px-8">
        <div className="space-y-6">
          {/* Dashboard Header */}
          <div className="space-y-4">
            <Skeleton className="mx-auto h-8 w-64" />
            <Skeleton className="mx-auto h-4 w-96" />
          </div>

          {/* Dashboard Content */}
          <div className="space-y-4">
            <div className="flex justify-end">
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center space-x-4 rounded-lg border p-4"
                >
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </div>
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
    <div className="mx-2 flex flex-col gap-4 px-2 py-2 md:mx-14 md:px-8">
      <h1 className="mt-4 py-2 text-center text-xl font-bold">
        Student-wise Assignments
      </h1>
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
