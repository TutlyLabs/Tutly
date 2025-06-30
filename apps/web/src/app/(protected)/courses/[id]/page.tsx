import { getServerSessionOrRedirect } from "@/lib/auth";
import CourseDetailsClient from "./_components/CourseDetailsClient";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await getServerSessionOrRedirect();
  const { id } = await params;
  return <CourseDetailsClient user={user} courseId={id} />;
}
