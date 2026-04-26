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
    <div className="flex flex-col gap-4 py-2 md:mx-14 md:px-8">
      <div>
        <h1 className="m-2 rounded-lg bg-gradient-to-r from-blue-600 to-sky-500 py-2 text-center text-xl font-semibold">
          ASSIGNMENTS
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
    </div>
  );
}
