"use client";

import { useAuthSession } from "@/components/auth/ProtectedShell";
import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import CoursesPageClient from "./_components/CoursesPageClient";

export default function CoursesPage() {
  const { user } = useAuthSession();
  const q = api.courses.getEnrolledCourses.useQuery();
  if (!user || q.isLoading) return <PageLoader />;
  return <CoursesPageClient user={user} coursesData={q.data} />;
}
