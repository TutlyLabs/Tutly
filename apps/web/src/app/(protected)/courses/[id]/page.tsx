import { getServerSessionOrRedirect } from "@/lib/auth";
import CourseDetailsClient from "./_components/CourseDetailsClient";
import { PageLayout } from "@/components/PageLayout";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await getServerSessionOrRedirect();
  const { id } = await params;
  return (
    <PageLayout forceClose={true}>
      <CourseDetailsClient user={user} courseId={id} />
    </PageLayout>
  );
}
