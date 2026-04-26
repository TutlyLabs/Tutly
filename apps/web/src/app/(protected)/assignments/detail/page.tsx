"use client";

import { useSearchParams } from "next/navigation";

import { Navigate } from "@/components/auth/Navigate";
import { useAuthSession } from "@/components/auth/ProtectedShell";
import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import AssignmentDetailClient from "../_components/AssignmentDetailClient";

export default function AssignmentDetailPage() {
  const { user } = useAuthSession();
  const sp = useSearchParams();
  const assignmentId = sp.get("id");

  const flagQ = api.featureFlags.isEnabled.useQuery({
    key: "sandbox_submission",
  });

  if (!user || flagQ.isLoading) return <PageLoader />;
  if (!assignmentId) return <Navigate to="/assignments" />;

  const searchParams: Record<string, string> = {};
  for (const [k, v] of sp.entries()) searchParams[k] = v;

  return (
    <AssignmentDetailClient
      assignmentId={assignmentId}
      currentUser={user}
      searchParams={searchParams}
      isSandboxSubmissionEnabled={Boolean(flagQ.data)}
    />
  );
}
