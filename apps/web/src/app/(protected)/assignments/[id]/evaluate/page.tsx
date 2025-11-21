import { redirect } from "next/navigation";
import { getServerSessionOrRedirect } from "@/lib/auth";
import { db } from "@/lib/db";
import ResizablePanelLayout from "../../_components/ResizablePanelLayout";
import { Buffer } from "node:buffer";
import { PageLayout } from "@/components/PageLayout";

interface EvaluatePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submissionId?: string; username?: string }>;
}

export default async function EvaluatePage({
  params,
  searchParams,
}: EvaluatePageProps) {
  const { user } = await getServerSessionOrRedirect();

  const assignmentId = (await params).id;
  const { submissionId, username } = await searchParams;

  if (user.role === "STUDENT") {
    redirect(`/assignments/${assignmentId}`);
  }

  const assignment = await db.attachment.findUnique({
    where: { id: assignmentId },
    include: { class: { include: { course: true } } },
  });

  if (!assignment) {
    redirect("/assignments");
  }

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

  const assignmentWithDecodedTemplate = {
    ...assignment,
    sandboxTemplate: decodedSandboxTemplate,
  };

  const submissions = await db.submission.findMany({
    where: {
      attachmentId: assignmentId,
      status: "SUBMITTED",
    },
    include: {
      enrolledUser: { include: { user: true } },
      points: true,
      assignment: true,
    },
    orderBy: { enrolledUser: { username: "asc" } },
  });

  let filteredSubmissions: any[] = [];

  if (user.role === "INSTRUCTOR") {
    filteredSubmissions = submissions;
  }

  if (user.role === "MENTOR") {
    filteredSubmissions = submissions.filter(
      (submission) => submission.enrolledUser.mentorUsername === user.username,
    );
  }

  if (assignment?.maxSubmissions && assignment.maxSubmissions > 1) {
    const submissionCount = await db.submission.groupBy({
      by: ["enrolledUserId"],
      where: {
        attachmentId: assignmentId,
        status: "SUBMITTED",
      },
      _count: { id: true },
    });

    filteredSubmissions.forEach((submission) => {
      const submissionCountData = submissionCount.find(
        (data) => data.enrolledUserId === submission.enrolledUserId,
      );
      if (submissionCountData) {
        submission.submissionCount = submissionCountData._count.id;
      }
    });

    filteredSubmissions.forEach((submission) => {
      submission.submissionIndex = 1;
      if (submission.submissionCount && submission.submissionCount > 1) {
        const submissionIndex =
          submissions
            .filter((sub) => sub.enrolledUserId === submission.enrolledUserId)
            .findIndex((sub) => sub.id === submission.id) || 0;
        submission.submissionIndex = submissionIndex + 1;
      }
    });
  }

  if (username) {
    filteredSubmissions = filteredSubmissions.filter(
      (submission: any) => submission?.enrolledUser.username === username,
    );
  }

  const submission = filteredSubmissions.find(
    (submission: any) => submission?.id === submissionId,
  );

  return (
    <PageLayout forceClose={true}>
      <ResizablePanelLayout
        assignmentId={assignmentId}
        assignment={assignmentWithDecodedTemplate}
        submissions={filteredSubmissions}
        submissionId={submissionId}
        username={username}
        submission={submission}
        submissionMode={assignmentWithDecodedTemplate?.submissionMode}
      />
    </PageLayout>
  );
}
