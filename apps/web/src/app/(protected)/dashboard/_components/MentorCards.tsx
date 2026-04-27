"use client";

import { Users, ClipboardCheck, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { api } from "@/trpc/react";
import { Skeleton } from "@tutly/ui/skeleton";

interface Props {
  selectedCourse: string;
}

const StatCard = ({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: number | string;
  label: string;
}) => {
  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-2 rounded-xl border border-white/40 bg-white p-3 text-center shadow-lg ring-1 shadow-black/5 ring-black/5 transition-colors hover:bg-white/95 sm:flex-row sm:items-center sm:gap-4 sm:p-5 sm:text-left">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 sm:h-14 sm:w-14">
        <Icon className="h-5 w-5 text-blue-600 sm:h-7 sm:w-7" />
      </div>
      <div className="flex w-full min-w-0 flex-col items-center sm:items-start">
        <p className="text-xl leading-none font-bold text-blue-600 tabular-nums sm:text-3xl">
          {value}
        </p>
        <h1 className="mt-1 line-clamp-2 w-full text-[10px] leading-tight font-medium tracking-wide text-slate-500 uppercase sm:text-xs sm:font-semibold sm:tracking-normal sm:text-slate-700 sm:normal-case">
          {label}
        </h1>
      </div>
    </div>
  );
};

export function MentorCards({ selectedCourse }: Props) {
  const { data: mentorDataResponse, isLoading } =
    api.dashboard.getMentorDashboardData.useQuery();

  if (isLoading) {
    return (
      <div className="relative z-10 mx-auto grid w-full grid-cols-3 gap-2 px-1 sm:max-w-6xl sm:grid-cols-3 sm:gap-6 sm:px-8 lg:gap-8 lg:px-10">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex w-full flex-col items-center gap-2 rounded-xl border border-white/40 bg-white p-3 shadow-lg ring-1 shadow-black/5 ring-black/5 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
          >
            <Skeleton className="h-10 w-10 rounded-lg sm:h-14 sm:w-14" />
            <div className="flex w-full flex-1 flex-col items-center gap-2 sm:items-start">
              <Skeleton className="h-6 w-12 sm:h-7 sm:w-20" />
              <Skeleton className="h-3 w-24 sm:w-32" />
            </div>
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
    <div className="relative z-10 mx-auto grid w-full grid-cols-3 gap-2 px-1 sm:max-w-6xl sm:grid-cols-3 sm:gap-6 sm:px-8 lg:gap-8 lg:px-10">
      <StatCard
        icon={Users}
        value={course?.menteeCount ?? 0}
        label="Assigned Mentees"
      />
      <StatCard
        icon={ClipboardCheck}
        value={course?.evaluatedAssignments ?? 0}
        label="Assignments Evaluated"
      />
      <StatCard
        icon={FileText}
        value={course?.totalSubmissions ?? 0}
        label="Total Submissions"
      />
    </div>
  );
}
