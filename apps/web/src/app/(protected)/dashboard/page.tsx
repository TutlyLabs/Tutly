"use client";

import { useQueryClient } from "@tanstack/react-query";

import Dashboard from "./_components/dashboard";
import { Navigate } from "@/components/auth/Navigate";
import { useAuthSession } from "@/components/auth/ProtectedShell";
import { PullToRefresh } from "@/components/native/PullToRefresh";
import { useCan } from "@/lib/permissions/client";

export default function DashboardPage() {
  const { user } = useAuthSession();
  const queryClient = useQueryClient();
  // `organization:list` is granted to SUPER_ADMIN alone.
  const isSuperAdmin = useCan("organization", "list");

  if (!user) return null;
  if (isSuperAdmin) return <Navigate to="/super-admin" />;

  return (
    <PullToRefresh onRefresh={() => queryClient.invalidateQueries()}>
      <Dashboard name={user.name} currentUser={user} />
    </PullToRefresh>
  );
}
