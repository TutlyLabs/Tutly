import { NextRequest, NextResponse } from "next/server";
import { env } from "process";
import { db } from "@/lib/db";
import { auth } from "@/server/auth";

export const dynamic = "force-dynamic";

const GITEA_API_URL = env.GITEA_API_URL;
const GITEA_ADMIN_TOKEN = env.GITEA_ADMIN_TOKEN;

async function handleGitRequest(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (!GITEA_API_URL || !GITEA_ADMIN_TOKEN) {
    return new NextResponse("Gitea configuration missing", { status: 500 });
  }

  // Authenticate the user session using headers forwarded from the request.
  const headers = new Headers(req.headers);
  const requestUrl = new URL(req.url);
  let token = requestUrl.searchParams.get("token");

  // Handle Git appending path to query param
  // e.g. token=XYZ/info/refs
  let extraPathParts: string[] = [];

  if (token && token.includes("/")) {
    const parts = token.split("/");
    token = parts[0];
    extraPathParts = parts.slice(1);
  }

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  } else {
    const authHeader = headers.get("authorization");
    if (authHeader && authHeader.startsWith("Basic ")) {
      try {
        const base64Credentials = authHeader.split(" ")[1];
        const credentials = Buffer.from(base64Credentials, "base64").toString(
          "ascii",
        );
        const [username, password] = credentials.split(":");

        // If a password is provided, it is treated as the session token (Bearer token).
        if (password) {
          headers.set("authorization", `Bearer ${password}`);
        }
      } catch (e) {
        console.error("[GitAuth] Failed to parse Basic Auth header:", e);
      }
    }
  }

  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Git Access"',
        },
      },
    );
  }

  const { path } = await params;
  const pathParts = path;
  const action = pathParts[0];

  // Validate the Git Proxy path structure.
  // Expected formats:
  // - /api/git/assignment/[assignmentId]/...
  // - /api/git/submission/[submissionId]/...

  if (action !== "assignment" && action !== "submission") {
    return new NextResponse("Not Found", { status: 404 });
  }

  // pathParts: ["assignment", "123", "info", "refs"] OR ["submission", "456", "git-upload-pack"]
  const type = pathParts[0]; // "assignment" | "submission"
  const id = pathParts[1];

  let cleanId = id;
  let gitPathParts = pathParts.slice(2);

  // Append extra path parts extracted from token
  if (extraPathParts.length > 0) {
    gitPathParts = [...gitPathParts, ...extraPathParts];
  }

  if (cleanId.endsWith(".git")) {
    cleanId = cleanId.replace(/\.git$/, "");
  }

  // Resolve the target Gitea repository path and associated Course ID based on the request type.
  let targetRepoPath: string | null = null;
  let courseId: string | null = null;

  if (type === "assignment") {
    const attachment = await db.attachment.findUnique({
      where: { id: cleanId },
      select: {
        gitTemplateRepo: true,
        courseId: true,
      },
    });
    targetRepoPath = attachment?.gitTemplateRepo || null;
    courseId = attachment?.courseId || null;
  } else if (type === "submission") {
    const submission = await db.submission.findUnique({
      where: { id: cleanId },
      select: {
        gitRepoPath: true,
        assignment: {
          select: {
            courseId: true,
          },
        },
      },
    });
    targetRepoPath = submission?.gitRepoPath || null;
    courseId = submission?.assignment?.courseId || null;
  }

  if (!targetRepoPath) {
    return new NextResponse("Repo not found", { status: 404 });
  }

  // Construct the upstream Gitea URL.
  const upstreamSearchParams = new URLSearchParams(requestUrl.searchParams);
  upstreamSearchParams.delete("token");
  const queryString = upstreamSearchParams.toString()
    ? `?${upstreamSearchParams.toString()}`
    : "";

  let giteaUrl = "";
  if (gitPathParts[0] === "archive") {
    // Remove .git from repo path for archive requests
    giteaUrl = `${GITEA_API_URL}/${targetRepoPath}/${gitPathParts.join("/")}${queryString}`;
  } else {
    giteaUrl = `${GITEA_API_URL}/${targetRepoPath}.git/${gitPathParts.join("/")}${queryString}`;
  }

  // Verify that the user is enrolled in the course and has the necessary permissions.
  if (courseId) {
    const enrollment = await db.enrolledUsers.findFirst({
      where: {
        username: session.user.username,
        courseId: courseId,
      },
      include: {
        user: true,
      },
    });

    if (!enrollment) {
      return new NextResponse("Forbidden: Not enrolled in this course", {
        status: 403,
      });
    }

    // For template repositories (Assignments), only Instructors and Admins are permitted to push changes.
    if (type === "assignment" && req.method === "POST") {
      if (
        enrollment.user.role !== "INSTRUCTOR" &&
        enrollment.user.role !== "ADMIN"
      ) {
        return new NextResponse(
          "Forbidden: Only instructors can modify template repositories",
          { status: 403 },
        );
      }
    }

    // For submission repositories, only the Student (owner) or Mentors are permitted to push changes.
    if (type === "submission" && req.method === "POST") {
      if (
        enrollment.user.role !== "STUDENT" &&
        enrollment.user.role !== "MENTOR"
      ) {
        return new NextResponse(
          "Forbidden: Only students can modify submission repositories",
          { status: 403 },
        );
      }
    }
  }

  // Proxy to Gitea
  headers.set("Authorization", `token ${GITEA_ADMIN_TOKEN}`); // Overwrite with Gitea admin token for proxy
  headers.delete("host");
  headers.delete("connection");

  try {
    const upstreamResponse = await fetch(giteaUrl, {
      method: req.method,
      headers: headers,
      body: req.body,
      // @ts-ignore
      duplex: "half",
    });

    // Security: Only pass through essential headers (Allowlist approach)
    const safeHeaders = new Headers();
    const allowedHeaders = [
      "content-type",
      "cache-control",
      "pragma",
      "expires",
      "date",
      "last-modified",
    ];

    upstreamResponse.headers.forEach((value, key) => {
      if (allowedHeaders.includes(key.toLowerCase())) {
        safeHeaders.set(key, value);
      }
    });

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: safeHeaders,
    });
  } catch (error) {
    console.error("Git Proxy Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export { handleGitRequest as GET, handleGitRequest as POST };
