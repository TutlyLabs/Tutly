"use client";

import { useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import Playground from "../_components/Playground";

type SandpackFile = {
  code: string;
  hidden?: boolean;
  active?: boolean;
  readOnly?: boolean;
};

type SandpackFiles = {
  [key: string]: SandpackFile;
};

export default function HtmlCssJsPlaygroundPage() {
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get("assignmentId") || undefined;
  const submissionId = searchParams.get("submissionId") || undefined;

  const { data: submissionData, isLoading } =
    api.submissions.getSubmissionForPlayground.useQuery(
      { submissionId: submissionId! },
      { enabled: !!submissionId },
    );

  if (isLoading) {
    return <div>Loading playground...</div>;
  }

  if (submissionId && (!submissionData?.success || !submissionData.data)) {
    return <div>Access Denied or submission not found</div>;
  }

  const initialFiles = submissionData?.data?.initialFiles as
    | SandpackFiles
    | undefined;

  return (
    <Playground
      assignmentId={assignmentId || ""}
      initialFiles={initialFiles}
      template="static"
    />
  );
}
