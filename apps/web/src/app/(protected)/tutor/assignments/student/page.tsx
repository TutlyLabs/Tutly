"use client";

import { useSearchParams } from "next/navigation";

import { Navigate } from "@/components/auth/Navigate";
import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import StudentWiseAssignments from "../_components/StudentWiseAssignments";

export default function StudentAssignmentsPage() {
  const userId = useSearchParams().get("id") ?? "";
  const q = api.assignments.getTutorStudentAssignmentsData.useQuery({ userId });
  if (q.isLoading) return <PageLoader />;
  if (q.data?.success === false) {
    return <Navigate to={q.data.redirectTo ?? "/assignments"} />;
  }
  if (!q.data?.success || !q.data.data) {
    return <div>No assignments found!</div>;
  }
  const { courses, sortedAssignments, userId: studentId } = q.data.data;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
        Assignments
      </h1>
      {!sortedAssignments || sortedAssignments.length === 0 ? (
        <div className="text-center">No Assignments found!</div>
      ) : (
        <StudentWiseAssignments
          courses={courses}
          assignments={sortedAssignments}
          userId={studentId}
        />
      )}
    </div>
  );
}
