import { getServerSessionOrRedirect } from "@tutly/auth";
import CoursesPageClient from "./_components/CoursesPageClient";

export default async function CoursesPage() {
  const { user } = await getServerSessionOrRedirect();
  return <CoursesPageClient user={user} />;
} 