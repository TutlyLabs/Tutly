"use client";

import { MdOutlineNoteAlt } from "react-icons/md";
import { PiStudentBold } from "react-icons/pi";
import { SiTicktick } from "react-icons/si";

import { api } from "@/trpc/react";
import { Skeleton } from "@tutly/ui/skeleton";

interface Props {
  selectedCourse: string;
}

export function MentorCards({ selectedCourse }: Props) {
  const { data: mentorDataResponse, isLoading } =
    api.dashboard.getMentorDashboardData.useQuery();

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

  if (!mentorDataResponse?.success || !mentorDataResponse.data) {
    return <div>No mentor data available</div>;
  }

  const mentorData = mentorDataResponse.data;
  const course = mentorData.courses.find((c) => c.courseId === selectedCourse);

  return (
    <div className="mb-10 flex flex-wrap justify-center gap-4">
      <div className="bg-card text-foreground w-full rounded-xl border p-4 shadow-sm">
        <PiStudentBold className="m-auto h-24 w-24 text-blue-400" />
        <p className="pt-2 font-bold text-blue-600">
          {course?.menteeCount ?? 0}
        </p>
        <h1 className="p-1 text-sm font-bold">Assigned mentees</h1>
      </div>
      <div className="bg-card text-foreground w-full rounded-xl border p-4 shadow-sm">
        <MdOutlineNoteAlt className="m-auto h-24 w-24 text-blue-400" />
        <p className="pt-2 font-bold text-blue-600">
          {course?.evaluatedAssignments ?? 0}
        </p>
        <h1 className="p-1 text-sm font-bold">Assignments evaluated</h1>
      </div>
      <div className="bg-card text-foreground w-full rounded-xl border p-4 shadow-sm">
        <SiTicktick className="m-auto my-2 h-20 w-20 text-blue-400" />
        <p className="pt-2 font-bold text-blue-600">
          {course?.totalSubmissions ?? 0}
        </p>
        <h1 className="p-1 text-sm font-bold">Total submissions</h1>
      </div>
    </div>
  );
}
