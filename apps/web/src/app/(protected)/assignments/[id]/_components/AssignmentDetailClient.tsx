"use client";

import type { SessionUser } from "@/lib/auth";
import AssignmentPage from "../../_components/AssignmentPage";
import { api } from "@/trpc/react";

interface Props {
  assignmentId: string;
  currentUser: SessionUser;
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function AssignmentDetailClient({
  assignmentId,
  currentUser,
  searchParams,
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
    return <div>Loading assignment details...</div>;
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
    />
  );
}
