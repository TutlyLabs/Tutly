import VSCodeEditor from "./vscode-editor";
import { db } from "@/lib/db";
import { getServerSessionOrRedirect } from "@/lib/auth";

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
  if (configParam && !assignmentId) {
    try {
      const decoded = JSON.parse(atob(configParam));
      console.log(decoded);
      if (decoded.assignmentId) {
        assignmentId = decoded.assignmentId;
      }
    } catch (error) {
      console.error("Failed to parse config param:", error);
    }
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
    />
  );
}
