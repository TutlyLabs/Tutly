"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/trpc/react";
import StudentWiseAssignments from "../_components/StudentWiseAssignments";

export default function StudentAssignmentsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const {
    data: assignmentsData,
    isLoading,
    error,
  } = api.assignments.getTutorStudentAssignmentsData.useQuery(
    { userId: userId! },
    { enabled: !!userId },
  );

  useEffect(() => {
    if (assignmentsData?.success === false) {
      if (assignmentsData.redirectTo) {
        router.push(assignmentsData.redirectTo);
      } else {
        router.push("/assignments");
      }
    }
  }, [assignmentsData, router]);

  if (isLoading) {
    return <div>Loading assignments...</div>;
  }

  if (error) {
    return <div>Error loading assignments</div>;
  }

  if (!assignmentsData?.success || !assignmentsData.data) {
    return <div>No assignments found!</div>;
  }

  const {
    courses,
    sortedAssignments,
    userId: studentId,
  } = assignmentsData.data;

  return (
    <div className="mx-2 flex flex-col gap-4 px-2 py-2 md:mx-6 md:px-8">
      <h1 className="py-2 text-center text-3xl font-semibold">ASSIGNMENTS</h1>
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
