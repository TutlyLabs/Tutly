"use client";

import { Navigate } from "@/components/auth/Navigate";
import { useAuthSession } from "@/components/auth/ProtectedShell";
import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";

export default function PostLoginPage() {
  const { user, isPending } = useAuthSession();
  const credQ = api.users.hasCredentialAccount.useQuery(undefined, {
    enabled: Boolean(user),
  });

  if (isPending || (user && credQ.isLoading)) return <PageLoader />;
  if (!user) return <Navigate to="/sign-in" />;
  return <Navigate to={credQ.data ? "/dashboard" : "/change-password"} />;
}
