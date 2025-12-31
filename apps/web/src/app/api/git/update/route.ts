import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/server/auth";
import { giteaClient } from "@/lib/gitea";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  try {
    // Authenticate the user session.
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, assignmentId, isPrivate } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Missing assignmentId" },
        { status: 400 },
      );
    }

    if (typeof isPrivate !== "boolean") {
      return NextResponse.json(
        { error: "Missing or invalid 'isPrivate' field" },
        { status: 400 },
      );
    }

    // Retrieve the associated Assignment Attachment.
    const attachment = await db.attachment.findUnique({
      where: { id: assignmentId },
      include: { course: true },
    });

    if (!attachment || !attachment.course) {
      return NextResponse.json(
        { error: "Assignment or Course not found" },
        { status: 404 },
      );
    }

    const courseSlug =
      attachment.course.slug || `course-${attachment.course.id.slice(0, 8)}`;

    // INSTRUCTOR FLOW: Update Template Repository visibility.
    if (type === "TEMPLATE") {
      // Verify that the user is enrolled as an INSTRUCTOR in the course.
      const enrollment = await db.enrolledUsers.findFirst({
        where: {
          username: session.user.username,
          courseId: attachment.courseId,
        },
        include: {
          user: true,
        },
      });

      if (
        !enrollment ||
        (enrollment.user.role !== "INSTRUCTOR" &&
          enrollment.user.role !== "ADMIN")
      ) {
        return NextResponse.json(
          {
            error:
              "Only enrolled instructors can update template repositories",
          },
          { status: 403 },
        );
      }

      if (!attachment.gitTemplateRepo) {
        return NextResponse.json(
          { error: "Template repository not found" },
          { status: 404 },
        );
      }

      const [owner, repoName] = attachment.gitTemplateRepo.split("/");

      try {
        await giteaClient.updateRepo(owner, repoName, {
          private: isPrivate,
        });

        return NextResponse.json({
          success: true,
          message: `Repository visibility updated to ${isPrivate ? "private" : "public"}`,
        });
      } catch (error: any) {
        console.error("Failed to update repository:", error);
        return NextResponse.json(
          { error: "Failed to update repository visibility" },
          { status: 500 },
        );
      }
    }

    // STUDENT FLOW: Update Submission Repository visibility.
    if (type === "SUBMISSION") {
      // Verify that the user is enrolled in the course.
      const enrolledUser = await db.enrolledUsers.findFirst({
        where: {
          username: session.user.username,
          courseId: attachment.courseId,
        },
        include: {
          user: true,
        },
      });

      if (!enrolledUser) {
        return NextResponse.json(
          {
            error: "Only enrolled users can update submission repositories",
          },
          { status: 403 },
        );
      }

      // Find the user's submission
      const submission = await db.submission.findFirst({
        where: {
          attachmentId: assignmentId,
          enrolledUserId: enrolledUser.id,
        },
      });

      if (!submission || !submission.gitRepoPath) {
        return NextResponse.json(
          { error: "Submission repository not found" },
          { status: 404 },
        );
      }

      const [owner, repoName] = submission.gitRepoPath.split("/");

      // Verify the user owns this repository
      if (owner !== session.user.username) {
        return NextResponse.json(
          { error: "You can only update your own repositories" },
          { status: 403 },
        );
      }

      try {
        await giteaClient.updateRepo(owner, repoName, {
          private: isPrivate,
        });

        return NextResponse.json({
          success: true,
          message: `Repository visibility updated to ${isPrivate ? "private" : "public"}`,
        });
      } catch (error: any) {
        console.error("Failed to update repository:", error);
        return NextResponse.json(
          { error: "Failed to update repository visibility" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    console.error("Repo Update Error:", error);
    return NextResponse.json(
      { error: "Failed to update repository" },
      { status: 500 },
    );
  }
}
