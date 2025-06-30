import { getServerSessionOrRedirect } from "@/lib/auth";
import AssignmentDetailClient from "./_components/AssignmentDetailClient";

export default async function AssignmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSessionOrRedirect();
  const currentUser = session.user;
  const { id: assignmentId } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <AssignmentDetailClient
      assignmentId={assignmentId}
      currentUser={currentUser}
      searchParams={resolvedSearchParams}
    />
  );
}
