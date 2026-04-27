"use client";

import { Navigate } from "@/components/auth/Navigate";
import PageLoader from "@/components/loader/PageLoader";
import NoDataFound from "@/components/NoDataFound";
import { api } from "@/trpc/react";
import SingleAssignmentBoard from "../_components/assignmentBoard";

export default function GetByAssignmentPage() {
  const q = api.assignments.getByAssignmentPageData.useQuery();
  if (q.isLoading) return <PageLoader />;
  if (q.data?.success === false) {
    return <Navigate to={q.data.redirectTo ?? "/assignments"} />;
  }
  if (!q.data?.success || !q.data.data) {
    return <div>No assignment data found!</div>;
  }
  const { courses, sortedAssignments } = q.data.data;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
        Assignments
      </h1>
      {courses && courses.length > 0 ? (
        <SingleAssignmentBoard
          courses={courses}
          assignments={sortedAssignments}
        />
      ) : (
        <NoDataFound message="No Course found!" />
      )}
    </div>
  );
}
