import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/lib/db";
import { giteaClient } from "@/lib/gitea";
import AdmZip from "adm-zip";

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

    if (!submission?.gitRepoPath) {
      return NextResponse.json(
        { error: "Submission repository not found" },
        { status: 404 },
      );
    }

    if (submission.status === "SUBMITTED" && action === "SUBMIT") {
      return NextResponse.json(
        { error: "Assignment already submitted" },
        { status: 403 },
      );
    }

    // 2. Process Zip File
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    const files: { path: string; content: string }[] = [];

    for (const entry of zipEntries) {
      if (!entry.isDirectory) {
        files.push({
          path: entry.entryName,
          content: entry.getData().toString("utf-8"),
        });
      }
    }

    // 3. Commit to Gitea
    const [owner, repo] = submission.gitRepoPath.split("/");

    const commitFiles = files.map((f) => ({
      path: f.path,
      content: f.content,
      status: "modified" as const,
    }));

    if (commitFiles.length > 0) {
      await giteaClient.createCommit(
        owner,
        repo,
        "main",
        action === "SUBMIT" ? "Submission upload via CLI" : "Save via CLI",
        commitFiles,
        {
          name: session.user.name || session.user.username,
          email: session.user.email || `${session.user.username}@tutly.in`,
        },
      );
    }

    const updatedCount = commitFiles.length;

    // Update submission status only if action is SUBMIT
    if (action === "SUBMIT") {
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
      submissionId: submission.id,
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
