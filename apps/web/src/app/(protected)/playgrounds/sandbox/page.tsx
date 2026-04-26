"use client";

import { useSearchParams } from "next/navigation";

import { Navigate } from "@/components/auth/Navigate";
import { useAuthSession } from "@/components/auth/ProtectedShell";
import PageLoader from "@/components/loader/PageLoader";
import { PageLayout } from "@/components/PageLayout";
import { api } from "@/trpc/react";
import { SandboxWrapper } from "./_components/SandboxWrapper";
import { SANDBOX_TEMPLATES } from "./_components/templetes";
import PlaygroundPage from "../../assignments/_components/PlaygroundPage";

export default function SandboxPage() {
  const { user } = useAuthSession();
  const sp = useSearchParams();
  const template = sp.get("template") ?? "static";
  const templateName = sp.get("name") ?? "Starter Template";
  const assignmentId = sp.get("assignmentId") ?? "";
  const submissionId = sp.get("submissionId") ?? "";
  const editTemplate = sp.get("editTemplate");

  const flagQ = api.featureFlags.isEnabled.useQuery({
    key: "sandbox_templates",
  });
  const dataQ = api.sandbox.getSandboxPageData.useQuery(
    { assignmentId: assignmentId || null, submissionId: submissionId || null },
    { enabled: Boolean(user) },
  );

  if (!user || flagQ.isLoading || dataQ.isLoading) return <PageLoader />;
  if (!flagQ.data) return <Navigate to="/playgrounds" />;
  if (dataQ.data && dataQ.data.allowed === false) return <Navigate to="/404" />;

  const { submission, assignment, showActions, canEditTemplate } = dataQ.data!;

  const validTemplates = Object.keys(SANDBOX_TEMPLATES);
  if (!validTemplates.includes(template) && !assignmentId) {
    return <Navigate to="/playgrounds" />;
  }

  return (
    <PageLayout forceClose className="!p-0" hideHeader hideCrisp>
      <div className="bg-background flex h-screen w-full flex-col overflow-hidden">
        {submissionId && submission ? (
          <PlaygroundPage
            submission={submission}
            submissionMode={submission.assignment.submissionMode}
            showActions={showActions}
            showAssignment
          />
        ) : (
          <SandboxWrapper
            assignmentId={assignmentId || null}
            template={template}
            templateName={templateName}
            canEditTemplate={canEditTemplate}
            isEditingTemplate={editTemplate === "true"}
            assignment={assignment}
            currentUser={user}
          />
        )}
      </div>
    </PageLayout>
  );
}
