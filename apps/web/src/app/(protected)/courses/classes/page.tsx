"use client";

import { useSearchParams } from "next/navigation";

import { Navigate } from "@/components/auth/Navigate";
import { useAuthSession } from "@/components/auth/ProtectedShell";
import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";

export default function ClassesPage() {
  const { user } = useAuthSession();
  const sp = useSearchParams();
  const courseId = sp.get("id");
  const q = api.classes.getLatestForCourse.useQuery(
    { courseId: courseId ?? "" },
    { enabled: Boolean(user && courseId) },
  );

  if (!user || q.isLoading) return <PageLoader />;
  if (!courseId) return <Navigate to="/courses" />;

  // Forward existing query string (minus our `id`) as extras on the redirect.
  const extras = new URLSearchParams(sp);
  extras.delete("id");
  if (q.data) extras.set("classId", q.data.id);
  extras.set("id", courseId);
  const target = q.data ? "/courses/class" : "/courses/detail";
  return <Navigate to={`${target}?${extras.toString()}`} />;
}
