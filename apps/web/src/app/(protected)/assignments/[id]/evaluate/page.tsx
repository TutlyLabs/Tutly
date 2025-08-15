import { redirect } from "next/navigation";
import { getServerSessionOrRedirect } from "@/lib/auth";
import AssignmentEvaluateClient from "./_components/AssignmentEvaluateClient";

export default async function AssignmentEvaluatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSessionOrRedirect();
  const user = session.user;
  const { id: assignmentId } = await params;
  const resolvedSearchParams = await searchParams;

  if (user?.role === "STUDENT") {
    redirect(`/assignments/${assignmentId}`);
  }

  return (
    <AssignmentEvaluateClient
      assignmentId={assignmentId}
      currentUser={user}
      searchParams={resolvedSearchParams}
    />
  );
}
