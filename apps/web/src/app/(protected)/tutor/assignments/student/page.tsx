"use client";

import { useSearchParams } from "next/navigation";

import { Navigate } from "@/components/auth/Navigate";
import PageLoader from "@/components/loader/PageLoader";
import NoDataFound from "@/components/NoDataFound";
import { api } from "@/trpc/react";
import StudentWiseAssignments from "../_components/StudentWiseAssignments";

export default function StudentAssignmentsPage() {
  const userId = useSearchParams().get("id") ?? "";
  const q = api.assignments.getTutorStudentAssignmentsData.useQuery({ userId });

  if (q.isLoading) return <PageLoader />;
  // FORBIDDEN means a student landed here; NOT_FOUND means the mentee is unknown.
  if (q.error) {
    return (
      <Navigate
        to={
          q.error.data?.code === "FORBIDDEN"
            ? "/assignments"
            : "/tutor/assignments/submissions"
        }
      />
    );
  }
  if (!q.data) {
    return (
      <div className="mx-auto w-full max-w-7xl py-12 text-center">
        <NoDataFound message="No assignments found" />
      </div>
    );
  }

  const { courses, sortedAssignments, userId: studentId, student } = q.data;

  return (
    <StudentWiseAssignments
      courses={courses}
      assignments={sortedAssignments}
      userId={studentId}
      student={student}
    />
  );
}
