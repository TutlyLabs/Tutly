"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import NoDataFound from "@/components/NoDataFound";
import SingleAssignmentBoard from "../_components/assignmentBoard";

export default function GetByAssignmentPage() {
  const router = useRouter();

  const {
    data: assignmentData,
    isLoading,
    error,
  } = api.assignments.getByAssignmentPageData.useQuery();

  useEffect(() => {
    if (assignmentData?.success === false) {
      if (assignmentData.redirectTo) {
        router.push(assignmentData.redirectTo);
      } else {
        router.push("/assignments");
      }
    }
  }, [assignmentData, router]);

  if (isLoading) {
    return <div>Loading assignments...</div>;
  }

  if (error) {
    return <div>Error loading assignments</div>;
  }

  if (!assignmentData?.success || !assignmentData.data) {
    return <div>No assignment data found!</div>;
  }

  const { courses, sortedAssignments } = assignmentData.data;

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
          <NoDataFound
            message="No Course found!"
            additionalMessage="All quiet... even the books took a break!"
          />
        )}
      </div>
    </div>
  );
}
