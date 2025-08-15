"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

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
    return <div className="text-center">Loading assignments dashboard...</div>;
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
        <Suspense fallback={<h1> Loading...</h1>}>
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
