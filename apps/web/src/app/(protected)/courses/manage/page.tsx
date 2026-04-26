"use client";

import { useSearchParams } from "next/navigation";

import { Navigate } from "@/components/auth/Navigate";
import NoDataFound from "@/components/NoDataFound";
import { useAuthSession } from "@/components/auth/ProtectedShell";
import PageLoader from "@/components/loader/PageLoader";
import CourseManageClient from "./_components/CourseManageClient";

export default function ManageCoursePage() {
  const { user } = useAuthSession();
  const id = useSearchParams().get("id");
  if (!user) return <PageLoader />;
  if (!id) return <Navigate to="/courses" />;
  if (user.role !== "INSTRUCTOR") return <NoDataFound message="Not found" />;
  return <CourseManageClient courseId={id} currentUser={user} />;
}
