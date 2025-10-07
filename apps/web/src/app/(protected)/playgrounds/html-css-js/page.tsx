import { api } from "@/trpc/server";
import { getServerSessionOrRedirect } from "@/lib/auth";
import Playground from "../_components/Playground";

type SandpackFile = {
  code: string;
  hidden?: boolean;
  active?: boolean;
  readOnly?: boolean;
};

type SandpackFiles = {
  [key: string]: SandpackFile;
};

interface HtmlCssJsPlaygroundPageProps {
  searchParams: Promise<{
    assignmentId?: string;
    submissionId?: string;
  }>;
}

export default async function HtmlCssJsPlaygroundPage({
  searchParams,
}: HtmlCssJsPlaygroundPageProps) {
  const session = await getServerSessionOrRedirect();
  const currentUser = session.user;
  const { assignmentId, submissionId } = await searchParams;

  let submissionData;
  if (submissionId) {
    submissionData = await api.submissions.getSubmissionForPlayground({
      submissionId,
    });
  }

  if (submissionId && (!submissionData?.success || !submissionData.data)) {
    return <div>Access Denied or submission not found</div>;
  }

  const initialFiles = submissionData?.data?.initialFiles as
    | SandpackFiles
    | undefined;

  return (
    <Playground
      assignmentId={assignmentId || ""}
      initialFiles={initialFiles}
      template="static"
      currentUser={currentUser}
    />
  );
}
