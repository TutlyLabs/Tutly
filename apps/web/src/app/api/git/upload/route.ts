import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/lib/db";
import { commitAndPushZip } from "@/lib/git-operations";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const action = (formData.get("action") as string) || "SUBMIT";
    const assignmentId = formData.get("assignmentId") as string;
    const file = formData.get("file") as File;

    if (!assignmentId || !file) {
      return NextResponse.json(
        { error: "Missing assignmentId or file" },
        { status: 400 },
      );
    }

    // 1. Get Submission Repo Info
    const enrolledUser = await db.enrolledUsers.findFirst({
      where: {
        username: session.user.username,
        courseId: (
          await db.attachment.findUnique({
            where: { id: assignmentId },
            select: { courseId: true },
          })
        )?.courseId,
      },
      include: {
        user: true,
      },
    });

    if (!enrolledUser) {
      return NextResponse.json(
        { error: "User not enrolled in course" },
        { status: 403 },
      );
    }

    const submission = await db.submission.findFirst({
      where: {
        attachmentId: assignmentId,
        enrolledUserId: enrolledUser.id,
      },
    });

    let gitRepoPath = submission?.gitRepoPath;

    // INSTRUCTOR OVERRIDE: If instructor/admin, use template repo
    if (
      enrolledUser.user.role === "INSTRUCTOR" ||
      enrolledUser.user.role === "ADMIN"
    ) {
      const attachment = await db.attachment.findUnique({
        where: { id: assignmentId },
      });
      if (attachment?.gitTemplateRepo) {
        gitRepoPath = attachment.gitTemplateRepo;
      }
    }

    if (!gitRepoPath) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 },
      );
    }

    // Block updates if already submitted (unless instructor override)
    const isInstructor =
      enrolledUser.user.role === "INSTRUCTOR" ||
      enrolledUser.user.role === "ADMIN";

    if (!isInstructor && submission?.status === "SUBMITTED") {
      return NextResponse.json(
        {
          error:
            "Assignment already submitted. You cannot make further changes.",
        },
        { status: 403 },
      );
    }

    // 2. Get file buffer
    const arrayBuffer = await file.arrayBuffer();
    const zipBuffer = Buffer.from(arrayBuffer);

    // 3. Commit and push using git commands
    const [owner, repo] = gitRepoPath.split("/");

    const result = await commitAndPushZip(
      zipBuffer,
      owner,
      repo,
      action === "SUBMIT" ? "Submission upload via CLI" : "Save via CLI",
      {
        name: session.user.name || session.user.username,
        email: session.user.email || `${session.user.username}@tutly.in`,
      },
    );

    const updatedCount = result.filesProcessed;

    // Update submission status only if action is SUBMIT and it's a student submission
    if (action === "SUBMIT" && submission) {
      await db.submission.update({
        where: { id: submission.id },
        data: {
          status: "SUBMITTED",
          submissionDate: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      submissionId: submission?.id,
      filesProcessed: updatedCount,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
