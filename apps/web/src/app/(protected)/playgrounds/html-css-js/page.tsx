"use client";

import { useSearchParams } from "next/navigation";

import { useAuthSession } from "@/components/auth/ProtectedShell";
import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import Playground from "../_components/Playground";

type SandpackFile = {
  code: string;
  hidden?: boolean;
  active?: boolean;
  readOnly?: boolean;
};
type SandpackFiles = { [key: string]: SandpackFile };

export default function HtmlCssJsPlaygroundPage() {
  const { user } = useAuthSession();
  const sp = useSearchParams();
  const assignmentId = sp.get("assignmentId") ?? "";
  const submissionId = sp.get("submissionId") ?? "";

  const submissionQ = api.submissions.getSubmissionForPlayground.useQuery(
    { submissionId },
    { enabled: Boolean(submissionId) },
  );

  if (!user) return <PageLoader />;
  if (submissionId && submissionQ.isLoading) return <PageLoader />;
  if (submissionId && (!submissionQ.data?.success || !submissionQ.data.data)) {
    return <div>Access Denied or submission not found</div>;
  }

  const initialFiles = submissionQ.data?.data?.initialFiles as
    | SandpackFiles
    | undefined;

  return (
    <Playground
      assignmentId={assignmentId}
      initialFiles={initialFiles}
      template="static"
      currentUser={user}
    />
  );
}
