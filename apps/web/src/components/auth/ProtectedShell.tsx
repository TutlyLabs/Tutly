"use client";

import { authClient } from "@/server/auth/client";
import { AppShellSkeleton } from "@/components/loader/Skeletons";
import { Navigate } from "./Navigate";

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { data, isPending } = authClient.useSession();

  if (isPending) return <AppShellSkeleton />;
  if (!data?.user) return <Navigate to="/sign-in" />;
  return <>{children}</>;
}

export function useAuthSession() {
  const { data, isPending } = authClient.useSession();
  return {
    user: data?.user ?? null,
    session: data?.session ?? null,
    isPending,
  };
}
