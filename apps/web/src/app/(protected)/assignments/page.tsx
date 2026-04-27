"use client";

import {
  ListSkeleton,
  PageHeaderSkeleton,
} from "@/components/loader/Skeletons";
import NoDataFound from "@/components/NoDataFound";
import { PullToRefresh } from "@/components/native/PullToRefresh";
import { api } from "@/trpc/react";
import AssignmentBoard from "./_components/AssignmentBoard";

export default function AssignmentsPage() {
  const q = api.assignments.getAssignmentsPageData.useQuery();

  if (q.isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <PageHeaderSkeleton />
        <ListSkeleton rows={6} />
      </div>
    );
  }
  if (!q.data?.success || !q.data.data) {
    return (
      <div className="mt-20 p-4 text-center font-semibold">
        <NoDataFound message="No Assignments available" />
      </div>
    );
  }

  const { courses, assignments } = q.data.data;

  return (
    <PullToRefresh onRefresh={() => q.refetch()}>
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
    </PullToRefresh>
  );
}
