import VSCodeEditor from "./vscode-editor";
import { db } from "@/lib/db";
import { getServerSessionOrRedirect } from "@/lib/auth";
import { jwtVerify } from "jose";
import { ShieldAlert } from "lucide-react";

export default async function VSCodePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { user } = await getServerSessionOrRedirect();

  const resolvedParams = await searchParams;
  const params = new URLSearchParams();

  Object.entries(resolvedParams).forEach(([key, value]) => {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, v));
      } else {
        params.append(key, value);
      }
    }
  });

  let assignment = null;
  let assignmentId = resolvedParams.assignmentId as string | undefined;

  const configParam = resolvedParams.config as string | undefined;
  let hasRunCommand = false;

  let isAuthorized = true;

  if (configParam) {
    try {
      const secret = new TextEncoder().encode(process.env.TUTLY_VSCODE_SECRET);
      const { payload } = await jwtVerify(configParam, secret);
      const decoded = payload as any;

      if (decoded.assignmentId && !assignmentId) {
        assignmentId = decoded.assignmentId;
      }
      if (decoded.tutlyConfig?.run?.command) {
        hasRunCommand = true;
      }
    } catch (error) {
      console.error("Failed to verify config param:", error);
      isAuthorized = false;
    }
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-red-500/10 p-4">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold">Unauthorized Access</h1>
          <p className="text-zinc-400">
            The configuration token is invalid or has been tampered with.
          </p>
        </div>
      </div>
    );
  }

  if (assignmentId) {
    try {
      assignment = await db.attachment.findUnique({
        where: { id: assignmentId },
        select: {
          id: true,
          title: true,
          class: {
            select: {
              course: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      console.error("Failed to fetch assignment:", error);
    }
  }

  const queryString = params.toString();
  const iframeSrc = queryString
    ? `/vscode/index.html?${queryString}`
    : "/vscode/index.html";

  return (
    <VSCodeEditor
      iframeSrc={iframeSrc}
      assignmentId={assignmentId}
      assignmentName={assignment?.title}
      courseName={assignment?.class?.course?.title}
      userName={user.name || user.username}
      userId={user.id}
      hasRunCommand={hasRunCommand}
    />
  );
}
