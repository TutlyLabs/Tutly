"use client";

import { MdOutlineNoteAlt } from "react-icons/md";
import { PiStudentBold } from "react-icons/pi";
import { SiGoogleclassroom } from "react-icons/si";

import { api } from "@/trpc/react";
import { Skeleton } from "@tutly/ui/skeleton";

interface Props {
  selectedCourse: string;
}

export function InstructorCards({ selectedCourse }: Props) {
  const { data: instructorDataResponse, isLoading } =
    api.dashboard.getInstructorDashboardData.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-card text-foreground w-full rounded-xl border p-4 shadow-sm"
          >
            <Skeleton className="mx-auto h-24 w-24 rounded-md" />
            <Skeleton className="mx-auto mt-2 h-8 w-16" />
            <Skeleton className="mx-auto mt-1 h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (!instructorDataResponse?.success || !instructorDataResponse.data) {
    return <div>No instructor data available</div>;
  }

  const instructorData = instructorDataResponse.data;
  const course = instructorData.courses.find(
    (c) => c.courseId === selectedCourse,
  );

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-card text-foreground w-full rounded-xl border p-4 shadow-sm">
          <MdOutlineNoteAlt className="m-auto h-24 w-24 text-blue-400" />
          <p className="pt-2 font-bold text-blue-600">
            {instructorData.totalCourses}
          </p>
          <h1 className="p-1 text-sm font-bold">courses created</h1>
        </div>
        {course && (
          <>
            <div className="bg-card text-foreground w-full rounded-xl border p-4 shadow-sm">
              <SiGoogleclassroom className="m-auto h-24 w-24 text-blue-400" />
              <p className="pt-2 font-bold text-blue-600">
                {course.classCount}
              </p>
              <h1 className="p-1 text-sm font-bold">Classes in this course</h1>
            </div>
            <div className="bg-card text-foreground w-full rounded-xl border p-4 shadow-sm">
              <PiStudentBold className="m-auto h-24 w-24 text-blue-400" />
              <p className="pt-2 font-bold text-blue-600">
                {course.studentCount}
              </p>
              <h1 className="p-1 text-sm font-bold">
                Students enrolled in this course
              </h1>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
