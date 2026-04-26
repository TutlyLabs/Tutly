"use client";

import PageLoader from "@/components/loader/PageLoader";
import NoDataFound from "@/components/NoDataFound";
import { api } from "@/trpc/react";
import AssignmentBoard from "./_components/AssignmentBoard";

export default function AssignmentsPage() {
  const q = api.assignments.getAssignmentsPageData.useQuery();
  if (q.isLoading) return <PageLoader />;
  if (!q.data?.success || !q.data.data) {
    return (
      <div className="mt-20 p-4 text-center font-semibold">
        <NoDataFound message="No Assignments available" />
      </div>
    );
  }
  const { courses, assignments } = q.data.data;
  return (
    <div className="mx-2 flex flex-col gap-4 px-2 py-2 md:px-6">
      {!courses || courses.length === 0 ? (
        <div className="mt-20 p-4 text-center font-semibold">
          <NoDataFound message="No Course available" />
        </div>
      ) : (
        <AssignmentBoard
          reviewed={true}
          courses={courses}
          assignments={assignments}
        />
      )}
    </div>
  );
}
