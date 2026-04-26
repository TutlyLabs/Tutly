"use client";

import { Navigate } from "@/components/auth/Navigate";
import { useAuthSession } from "@/components/auth/ProtectedShell";
import PageLoader from "@/components/loader/PageLoader";

export default function Page() {
  const { user, isPending } = useAuthSession();
  if (isPending) return <PageLoader />;
  return <Navigate to={user ? "/dashboard" : "/sign-in"} />;
}
