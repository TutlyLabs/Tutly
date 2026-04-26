"use client";

import { useSearchParams } from "next/navigation";

import { Navigate } from "@/components/auth/Navigate";
import { useAuthSession } from "@/components/auth/ProtectedShell";
import PageLoader from "@/components/loader/PageLoader";
import { PageLayout } from "@/components/PageLayout";
import { api } from "@/trpc/react";
import ResizablePanelLayout from "../_components/ResizablePanelLayout";

function decodeSandboxTemplate(value: unknown) {
  if (typeof value !== "string") return value;
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return value;
  }
}

export default function EvaluatePage() {
  const { user } = useAuthSession();
  const sp = useSearchParams();
  const assignmentId = sp.get("id");
  const submissionId = sp.get("submissionId") ?? undefined;
  const username = sp.get("username") ?? undefined;

  const q = api.assignments.getAssignmentEvaluateData.useQuery(
    { assignmentId: assignmentId ?? "", submissionId, username },
    { enabled: Boolean(user && assignmentId) },
  );

  if (!user || q.isLoading) return <PageLoader />;
  if (!assignmentId) return <Navigate to="/assignments" />;
  if (user.role === "STUDENT") {
    return <Navigate to={`/assignments/detail?id=${assignmentId}`} />;
  }
  if (!q.data?.success || !q.data.data) {
    return <Navigate to="/assignments" />;
  }

  const { assignment, submissions, submission } = q.data.data;
  const assignmentWithDecodedTemplate = assignment
    ? {
        ...assignment,
        sandboxTemplate: decodeSandboxTemplate(
          (assignment as { sandboxTemplate?: unknown }).sandboxTemplate,
        ),
      }
    : null;

  return (
    <PageLayout forceClose>
      <ResizablePanelLayout
        assignmentId={assignmentId}
        assignment={assignmentWithDecodedTemplate}
        submissions={submissions}
        submissionId={submissionId}
        username={username}
        submission={submission}
        submissionMode={
          (assignmentWithDecodedTemplate as { submissionMode?: unknown })
            ?.submissionMode
        }
      />
    </PageLayout>
  );
}
