"use client";

import { useSearchParams } from "next/navigation";

import { Navigate } from "@/components/auth/Navigate";
import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";

export default function ProfileViewPage() {
  const username = useSearchParams().get("u") ?? "";
  const q = api.users.getProfileRedirect.useQuery(
    { username },
    { enabled: Boolean(username) },
  );

  if (!username) return <Navigate to="/profile" />;
  if (q.isLoading) return <PageLoader />;
  if (!q.data?.courseId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div>No enrolled courses found</div>
      </div>
    );
  }
  const role = q.data.isMentor ? "mentor" : "student";
  return (
    <Navigate
      to={`/tutor/statistics/detail?id=${q.data.courseId}&${role}=${q.data.username}`}
    />
  );
}
