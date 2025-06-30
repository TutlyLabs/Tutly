"use client";

import AssignmentBoard from "./_components/AssignmentBoard";
import NoDataFound from "@/components/NoDataFound";
import { api } from "@/trpc/react";

export default function AssignmentsPage() {
  const { data: assignmentsData, isLoading } =
    api.assignments.getAssignmentsPageData.useQuery();

  if (isLoading) {
    return <div>Loading assignments...</div>;
  }

  if (!assignmentsData?.success || !assignmentsData.data) {
    return (
      <div className="mt-20 p-4 text-center font-semibold">
        <NoDataFound
          message="No Assignments available"
          additionalMessage="Assignment-free moment!"
        />
      </div>
    );
  }

  const { courses, assignments } = assignmentsData.data;

  return (
    <div className="mx-2 flex flex-col gap-4 px-2 py-2 md:px-6">
      {!courses || courses.length === 0 ? (
        <div className="mt-20 p-4 text-center font-semibold">
          <NoDataFound
            message="No Course available"
            additionalMessage="Nothing to see here - the schedule's on vacation!"
          />
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
