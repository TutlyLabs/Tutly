import { redirect } from "next/navigation";
import { getServerSessionOrRedirect } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { SandboxWrapper } from "./_components/SandboxWrapper";
import { SANDBOX_TEMPLATES } from "./_components/templetes";
import { db } from "@/lib/db";
import { Buffer } from "node:buffer";
import PlaygroundPage from "../../assignments/_components/PlaygroundPage";
import { PageLayout } from "@/components/PageLayout";

export default async function SandboxPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSessionOrRedirect();
  const currentUser = session.user;

  const searchParams = await searchParamsPromise;

  const template = (searchParams.template as string) || "static";
  const templateName = (searchParams.name as string) || "Starter Template";
  const assignmentId = (searchParams.assignmentId as string) || "";
  const submissionId = (searchParams.submissionId as string) || "";
  const editTemplate = searchParams.editTemplate as string;

  const isSandboxEnabled = await isFeatureEnabled("sandbox_templates", currentUser);

  if (!isSandboxEnabled) {
    redirect("/playgrounds");
  }

  const submission = submissionId
    ? await db.submission.findUnique({
      where: { id: submissionId },
      include: {
        enrolledUser: {
          include: {
            user: true,
          },
        },
        points: true,
        assignment: true,
      },
    })
    : null;

  const studentAccess =
    currentUser.role === "STUDENT" &&
    submission?.enrolledUser.username === currentUser.username;
  const mentorAccess =
    currentUser.role === "MENTOR" &&
    submission?.enrolledUser.mentorUsername === currentUser.username;
  const instrctorAccess = currentUser.role === "INSTRUCTOR";

  if (!studentAccess && !mentorAccess && !instrctorAccess && submissionId) {
    redirect("/404");
  }

  const showActions = instrctorAccess || mentorAccess;

  const assignment = assignmentId
    ? await db.attachment.findUnique({
      where: {
        id: assignmentId,
        attachmentType: "ASSIGNMENT",
      },
    })
    : null;

  let decodedSandboxTemplate = null;
  if (assignment?.sandboxTemplate) {
    try {
      const decodedString = Buffer.from(
        assignment.sandboxTemplate as string,
        "base64",
      ).toString("utf-8");
      decodedSandboxTemplate = JSON.parse(decodedString);
    } catch (error) {
      decodedSandboxTemplate = assignment.sandboxTemplate;
    }
  }

  const assignmentWithDecodedTemplate = assignment
    ? {
      ...assignment,
      sandboxTemplate: decodedSandboxTemplate,
    }
    : null;

  const validTemplates = Object.keys(SANDBOX_TEMPLATES);
  if (!validTemplates.includes(template) && !assignmentId) {
    redirect("/playgrounds");
  }

  const canEditTemplate =
    currentUser.role === "INSTRUCTOR" || currentUser.role === "ADMIN";

  return (
    <PageLayout
      forceClose={true}
      className="!p-0"
      hideHeader={true}
      hideCrisp={true}
    >
      <div className="bg-background flex h-screen w-full flex-col overflow-hidden">
        {submissionId && submission ? (
          <PlaygroundPage
            submission={submission}
            submissionMode={submission.assignment.submissionMode}
            showActions={showActions}
            showAssignment={true}
          />
        ) : (
          <SandboxWrapper
            assignmentId={assignmentId ?? null}
            template={template}
            templateName={templateName}
            canEditTemplate={canEditTemplate}
            isEditingTemplate={editTemplate === "true"}
            assignment={assignmentWithDecodedTemplate}
            currentUser={currentUser}
          />
        )}
      </div>
    </PageLayout>
  );
}
