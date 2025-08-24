"use client";

import { MdOutlineNoteAlt } from "react-icons/md";
import { PiStudentBold } from "react-icons/pi";
import { SiGoogleclassroom } from "react-icons/si";

import { api } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  selectedCourse: string;
}

export function InstructorCards({ selectedCourse }: Props) {
  const { data: instructorDataResponse, isLoading } =
    api.dashboard.getInstructorDashboardData.useQuery();

  if (isLoading) {
    return (
      <div className="mb-10 flex flex-wrap justify-center gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-80 rounded-md bg-white p-2 text-gray-900 shadow-xl"
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
      <div className="mb-10 flex flex-wrap justify-center gap-4">
        <div className="w-80 rounded-md bg-white p-2 text-gray-900 shadow-xl">
          <MdOutlineNoteAlt className="m-auto h-24 w-24 text-blue-400" />
          <p className="pt-2 font-bold text-blue-600">
            {instructorData.totalCourses}
          </p>
          <h1 className="p-1 text-sm font-bold">courses created</h1>
        </div>
        {course && (
          <>
            <div className="w-80 rounded-md bg-white p-2 text-gray-900 shadow-xl">
              <SiGoogleclassroom className="m-auto h-24 w-24 text-blue-400" />
              <p className="pt-2 font-bold text-blue-600">
                {course.classCount}
              </p>
              <h1 className="p-1 text-sm font-bold">Classes in this course</h1>
            </div>
            <div className="w-80 rounded-md bg-white p-2 text-gray-900 shadow-xl">
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
