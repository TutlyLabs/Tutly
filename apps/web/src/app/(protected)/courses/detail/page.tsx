"use client";

import { useSearchParams } from "next/navigation";

import { Navigate } from "@/components/auth/Navigate";
import { useAuthSession } from "@/components/auth/ProtectedShell";
import PageLoader from "@/components/loader/PageLoader";
import CourseDetailsClient from "./_components/CourseDetailsClient";
import { PageLayout } from "@/components/PageLayout";

export default function CoursePage() {
  const { user } = useAuthSession();
  const id = useSearchParams().get("id");
  if (!user) return <PageLoader />;
  if (!id) return <Navigate to="/courses" />;
  return (
    <PageLayout forceClose>
      <CourseDetailsClient user={user} courseId={id} />
    </PageLayout>
  );
}
