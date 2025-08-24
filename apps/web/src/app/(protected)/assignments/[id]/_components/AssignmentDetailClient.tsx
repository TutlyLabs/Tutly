"use client";

import type { SessionUser } from "@/lib/auth";
import AssignmentPage from "../../_components/AssignmentPage";
import { api } from "@/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  assignmentId: string;
  currentUser: SessionUser;
  searchParams: { [key: string]: string | string[] | undefined };
  isSandboxSubmissionEnabled: boolean;
}

export default function AssignmentDetailClient({
  assignmentId,
  currentUser,
  searchParams,
  isSandboxSubmissionEnabled,
}: Props) {
  const username = searchParams.username as string | undefined;
  const page = parseInt((searchParams.page as string) || "1");
  const limit = parseInt((searchParams.limit as string) || "10");
  const selectedMentor = searchParams.mentor as string | undefined;
  const searchQuery = (searchParams.search as string) || "";

  const { data: assignmentData, isLoading } =
    api.assignments.getAssignmentDetailData.useQuery({
      assignmentId,
      username,
      page,
      limit,
      selectedMentor,
      searchQuery,
    });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        {/* Assignment Header */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Assignment Content */}
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>

        {/* Assignment Details */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!assignmentData?.success || !assignmentData.data) {
    return <div>Assignment not found or you don&apos;t have access to it.</div>;
  }

  const {
    assignment,
    assignments,
    notSubmittedMentees,
    isCourseAdmin,
    mentors,
    pagination,
  } = assignmentData.data;

  return (
    <AssignmentPage
      currentUser={currentUser}
      assignment={assignment}
      assignments={assignments}
      notSubmittedMentees={notSubmittedMentees}
      isCourseAdmin={isCourseAdmin}
      username={username ?? ""}
      mentors={mentors}
      pagination={pagination}
      isSandboxSubmissionEnabled={isSandboxSubmissionEnabled}
    />
  );
}
