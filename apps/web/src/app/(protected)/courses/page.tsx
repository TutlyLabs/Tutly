import { getServerSessionOrRedirect } from "@/lib/auth";
import { api } from "@/trpc/server";
import CoursesPageClient from "./_components/CoursesPageClient";

export default async function CoursesPage() {
  const { user } = await getServerSessionOrRedirect();
  const coursesData = await api.courses.getEnrolledCourses();

  return <CoursesPageClient user={user} coursesData={coursesData} />;
}
