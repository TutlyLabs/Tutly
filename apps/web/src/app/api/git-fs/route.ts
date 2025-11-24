import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/lib/db";
import { giteaClient } from "@/lib/gitea";

/**
 * Tutly FS API - Provides file system operations for Git repositories
 * Endpoints:
 * - GET /api/git-fs/contents?assignmentId=...&path=...&ref=...&type=TEMPLATE
 */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const operation = searchParams.get("operation");
  const assignmentId = searchParams.get("assignmentId");

  if (!assignmentId) {
    return NextResponse.json(
      { error: "assignmentId required" },
      { status: 400 },
    );
  }

  //  Fetch assignment and check enrollment
  const assignment = await db.attachment.findUnique({
    where: { id: assignmentId },
    select: {
      gitTemplateRepo: true,
      courseId: true,
      course: {
        include: {
          enrolledUsers: {
            where: {
              user: {
                role: "INSTRUCTOR",
              },
            },
          },
        },
      },
    },
  });

  if (!assignment) {
    return NextResponse.json(
      { error: "Assignment not found" },
      { status: 404 },
    );
  }

  const courseId = assignment.courseId;

  // Check if user has access to this course
  const enrollment = await db.enrolledUsers.findFirst({
    where: {
      username: session.user.username,
      courseId: courseId,
    },
  });

  if (!enrollment) {
    return NextResponse.json(
      { error: "Not enrolled in this course" },
      { status: 403 },
    );
  }

  let repoPath: string | null = null;

  // Check if user is enrolled as instructor
  const isInstructor =
    assignment.course?.enrolledUsers?.some(
      (enrolled) => enrolled.username === session.user.username,
    ) || false;

  if (isInstructor) {
    // Instructor gets template repo
    repoPath = assignment.gitTemplateRepo;
  } else {
    // Student gets their submission repo
    const submission = await db.submission.findFirst({
      where: {
        assignment: {
          id: assignmentId,
        },
        enrolledUser: {
          user: {
            id: session.user.id,
          },
        },
      },
      select: { gitRepoPath: true },
      orderBy: { createdAt: "desc" },
    });
    repoPath = submission?.gitRepoPath || null;
  }

  if (!repoPath) {
    return NextResponse.json(
      {
        error: isInstructor
          ? "Template repository not found"
          : "No submission found",
      },
      { status: 404 },
    );
  }

  const [owner, repo] = repoPath.split("/");

  try {
    switch (operation) {
      case "contents": {
        const path = searchParams.get("path") || "";
        const ref = searchParams.get("ref") || "main";
        const contents = await giteaClient.getContents(owner, repo, path, ref);
        return NextResponse.json(contents);
      }

      default:
        return NextResponse.json(
          { error: "Invalid operation" },
          { status: 400 },
        );
    }
  } catch (error: any) {
    console.error("Tutly FS API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500 },
    );
  }
}
