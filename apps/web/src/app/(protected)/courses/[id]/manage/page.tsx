import { notFound } from "next/navigation";
import { getServerSessionOrRedirect } from "@/lib/auth";
import CourseManageClient from "./_components/CourseManageClient";

export default async function ManageCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSessionOrRedirect();

  if (!session?.user || session.user.role !== "INSTRUCTOR") {
    return notFound();
  }

  const { id } = await params;

  return <CourseManageClient courseId={id} currentUser={session.user} />;
}
