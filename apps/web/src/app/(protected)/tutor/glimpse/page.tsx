"use client";

import { Navigate } from "@/components/auth/Navigate";
import { useAuthSession } from "@/components/auth/ProtectedShell";
import PageLoader from "@/components/loader/PageLoader";
import GlimpseClient from "./_components/GlimpseClient";

export default function GlimpsePage() {
  const { user, isPending } = useAuthSession();
  if (isPending) return <PageLoader />;
  if (!user) return <Navigate to="/sign-in" />;
  if (
    user.role !== "INSTRUCTOR" &&
    user.role !== "ADMIN" &&
    user.role !== "SUPER_ADMIN" &&
    user.role !== "MENTOR"
  ) {
    return <Navigate to="/dashboard" />;
  }
  return <GlimpseClient />;
}
