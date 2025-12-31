import { NextRequest, NextResponse } from "next/server";
import { env } from "process";
import { db } from "@/lib/db";
import { auth } from "@/server/auth";
import { giteaClient } from "@/lib/gitea";

export const dynamic = "force-dynamic";

const APP_URL =
  env.NEXT_PUBLIC_APP_URL || env.APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("assignmentId");
    const type = searchParams.get("type");

    if (!assignmentId || !type) {
      return NextResponse.json(
        { error: "Missing assignmentId or type" },
        { status: 400 },
      );
    }

    const attachment = await db.attachment.findUnique({
      where: { id: assignmentId },
      include: { course: true },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 },
      );
    }

    const token = session.session?.token;
    const expiresAt = session.session?.expiresAt;

    if (type === "TEMPLATE") {
      // Check if template repo exists
      if (!attachment.gitTemplateRepo) {
        return NextResponse.json({ exists: false });
      }

      const [owner, repoName] = attachment.gitTemplateRepo.split("/");
      const repoDetails = await giteaClient.getRepo(owner, repoName);

      let repoUrl = `${APP_URL}/api/git/assignment/${assignmentId}.git`;
      if (token) {
        const urlObj = new URL(repoUrl);
        urlObj.username = session.user.username;
        urlObj.password = token;
        repoUrl = urlObj.toString();
      }

      return NextResponse.json({
        exists: true,
        repoUrl,
        expiresAt,
        isPrivate: repoDetails?.private ?? true,
      });
    }

    if (type === "SUBMISSION") {
      // Find user's submission
      const enrolledUser = await db.enrolledUsers.findFirst({
        where: {
          username: session.user.username,
          courseId: attachment.courseId,
        },
      });

      if (!enrolledUser) {
        return NextResponse.json({ exists: false });
      }

      const submission = await db.submission.findFirst({
        where: {
          attachmentId: assignmentId,
          enrolledUserId: enrolledUser.id,
        },
      });

      if (!submission?.gitRepoPath) {
        return NextResponse.json({ exists: false });
      }

      const [owner, repoName] = submission.gitRepoPath.split("/");
      const repoDetails = await giteaClient.getRepo(owner, repoName);

      let repoUrl = `${APP_URL}/api/git/submission/${submission.id}.git`;
      if (token) {
        const urlObj = new URL(repoUrl);
        urlObj.username = session.user.username;
        urlObj.password = token;
        repoUrl = urlObj.toString();
      }

      return NextResponse.json({
        exists: true,
        repoUrl,
        expiresAt,
        lastUpdated: submission.updatedAt,
        submissionId: submission.id,
        isPrivate: repoDetails?.private ?? true,
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching repo info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate the user session.
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, assignmentId } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Missing assignmentId" },
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

    // Ensure the corresponding Organization exists in Gitea.
    await giteaClient.ensureOrgExists(courseSlug);

    // INSTRUCTOR FLOW: Create a Template Repository.
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
            error: "Only enrolled instructors can create template repositories",
          },
          { status: 403 },
        );
      }

      const repoName = `template-${attachment.title.replace(/[^a-zA-Z0-9-_]/g, "-")}`;
      const owner = courseSlug; // Template goes to Org

      try {
        await giteaClient.createRepo(owner, repoName, true, true); // isPrivate=true, isTemplate=true
      } catch (e: any) {
        // Ignore if exists
      }

      const gitRepoPath = `${owner}/${repoName}`;

      await db.attachment.update({
        where: { id: assignmentId },
        data: { gitTemplateRepo: gitRepoPath },
      });

      // Add initial .tutly/config.yaml to the template
      try {
        const defaultConfig = `version: 1

# run:
#   command: "npm test"
#   description: "Run tests"

readonly:
  - "tests/**/*"
  - ".tutly/**/*"
  - "package.json"
`;

        await giteaClient.createCommit(
          owner,
          repoName,
          "main",
          "Add Tutly configuration",
          [
            {
              path: ".tutly/config.yaml",
              content: defaultConfig,
              status: "added",
            },
          ],
          {
            name: session.user.name || session.user.username,
            email: session.user.email || `${session.user.username}@tutly.in`,
          },
        );
      } catch (configError) {
        console.log("Failed to add initial config.yaml:", configError);
        // Don't fail the whole operation if config creation fails
      }

      // Retrieve the session token to embed in the clone URL.
      const token = session.session?.token;
      const expiresAt = session.session?.expiresAt;

      let repoUrl = `${APP_URL}/api/git/assignment/${assignmentId}.git`;
      if (token) {
        const urlObj = new URL(repoUrl);
        urlObj.username = session.user.username;
        urlObj.password = token;
        repoUrl = urlObj.toString();
      }

      return NextResponse.json({
        success: true,
        repoUrl: repoUrl,
        expiresAt: expiresAt,
      });
    }

    // STUDENT FLOW: Create a Submission Repository.
    if (type === "SUBMISSION") {
      if (!attachment.gitTemplateRepo) {
        return NextResponse.json(
          { error: "Template repo not ready" },
          { status: 400 },
        );
      }

      // Verify that the user is enrolled as a STUDENT in the course.
      const enrolledUser = await db.enrolledUsers.findFirst({
        where: {
          username: session.user.username,
          courseId: attachment.courseId,
        },
        include: {
          user: true,
        },
      });

      if (
        !enrolledUser ||
        (enrolledUser.user.role !== "STUDENT" &&
          enrolledUser.user.role !== "MENTOR")
      ) {
        return NextResponse.json(
          {
            error: "Only enrolled students can create submission repositories",
          },
          { status: 403 },
        );
      }

      // Check for an existing submission or create a new pending submission record.
      let submission = await db.submission.findFirst({
        where: {
          attachmentId: assignmentId,
          enrolledUserId: enrolledUser.id,
        },
      });

      if (!submission) {
        submission = await db.submission.create({
          data: {
            attachmentId: assignmentId,
            enrolledUserId: enrolledUser.id,
            status: "IN_PROGRESS",
          },
        });
      } else if (submission.gitRepoPath) {
        // Retrieve the session token to embed in the clone URL.
        const token = session.session?.token;
        const expiresAt = session.session?.expiresAt;

        let repoUrl = `${APP_URL}/api/git/submission/${submission.id}.git`;
        if (token) {
          const urlObj = new URL(repoUrl);
          urlObj.username = session.user.username;
          urlObj.password = token;
          repoUrl = urlObj.toString();
        }

        return NextResponse.json({
          message: "Repo already exists",
          repoUrl: repoUrl,
          expiresAt: expiresAt,
          submissionId: submission.id,
        });
      }

      // Ensure the Student user exists in Gitea.
      const studentUsername = session.user.username;
      await giteaClient.ensureUserExists(
        studentUsername,
        session.user.email || `${studentUsername}@tutly.in`,
      );

      // Add the Student to the Course Organization to grant read access to the template (if private).
      await giteaClient.addUserToOrg(courseSlug, studentUsername);

      // Generate the Submission Repository from the Template.
      const [templateOwner, templateRepoName] =
        attachment.gitTemplateRepo.split("/");
      const newRepoName = `${courseSlug}-${attachment.title.replace(/[^a-zA-Z0-9-_]/g, "-")}-${studentUsername}`;
      const owner = studentUsername; // Student owns their submission

      await giteaClient.ensureUserExists(
        owner,
        session.user.email || `${owner}@tutly.in`,
      );

      try {
        await giteaClient.generateRepoFromTemplate(
          templateOwner,
          templateRepoName,
          owner,
          newRepoName,
        );
      } catch (e: any) {
        const exists = await giteaClient.checkRepoExists(owner, newRepoName);
        if (!exists) throw e;
      }

      const gitRepoPath = `${owner}/${newRepoName}`;

      await db.submission.update({
        where: { id: submission.id },
        data: {
          gitRepoPath,
          status: "IN_PROGRESS",
          submissionLink: `${APP_URL}/api/git/submission/${submission.id}.git`,
        },
      });

      // Retrieve the session token to embed in the clone URL.
      const token = session.session?.token;
      const expiresAt = session.session?.expiresAt;

      let repoUrl = `${APP_URL}/api/git/submission/${submission.id}.git`;
      if (token) {
        const urlObj = new URL(repoUrl);
        urlObj.username = session.user.username;
        urlObj.password = token;
        repoUrl = urlObj.toString();
      }

      return NextResponse.json({
        success: true,
        repoUrl: repoUrl,
        expiresAt: expiresAt,
        submissionId: submission.id,
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    console.error("Repo Creation Error:", error);
    return NextResponse.json(
      { error: "Failed to create repository" },
      { status: 500 },
    );
  }
}
