import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import StudentWiseAssignments from "../_components/StudentWiseAssignments";

interface StudentAssignmentsPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentAssignmentsPage({
  params,
}: StudentAssignmentsPageProps) {
  try {
    const { id: userId } = await params;

    const assignmentsData =
      await api.assignments.getTutorStudentAssignmentsData({
        userId,
      });

    if (assignmentsData?.success === false) {
      if (assignmentsData.redirectTo) {
        redirect(assignmentsData.redirectTo);
      } else {
        redirect("/assignments");
      }
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
  } catch (error) {
    redirect("/assignments");
  }
}
