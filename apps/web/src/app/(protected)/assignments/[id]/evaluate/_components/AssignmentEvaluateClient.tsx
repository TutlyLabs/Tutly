"use client";

import type { SessionUser } from "@/lib/auth";
import ResizablePanelLayout from "../../../_components/ResizablePanelLayout";
import { api } from "@/trpc/react";

interface Props {
  assignmentId: string;
  currentUser: SessionUser;
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function AssignmentEvaluateClient({
  assignmentId,
  currentUser,
  searchParams,
}: Props) {
  const submissionId = searchParams.submissionId as string | undefined;
  const username = searchParams.username as string | undefined;

  const { data: evaluateData, isLoading } =
    api.assignments.getAssignmentEvaluateData.useQuery({
      assignmentId,
      submissionId,
      username,
    });

  if (isLoading) {
    return <div>Loading evaluation data...</div>;
  }

  if (!evaluateData?.success || !evaluateData.data) {
    return <div>Failed to load evaluation data or access denied.</div>;
  }

  const { assignment, submissions, submission } = evaluateData.data;

  return (
    <ResizablePanelLayout
      assignmentId={assignmentId}
      assignment={assignment}
      submissions={submissions}
      submissionId={submissionId ?? ""}
      username={username ?? ""}
      submission={submission}
    />
  );
}
