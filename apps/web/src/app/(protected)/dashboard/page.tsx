"use client";

import { useQueryClient } from "@tanstack/react-query";

import Dashboard from "./_components/dashboard";
import { Navigate } from "@/components/auth/Navigate";
import { useAuthSession } from "@/components/auth/ProtectedShell";
import { PullToRefresh } from "@/components/native/PullToRefresh";

export default function DashboardPage() {
  const { user } = useAuthSession();
  const queryClient = useQueryClient();

  if (!user) return null;
  if (user.role === "SUPER_ADMIN") return <Navigate to="/super-admin" />;

  return (
    <PullToRefresh
      onRefresh={() => queryClient.invalidateQueries()}
    >
      <Dashboard name={user.name} currentUser={user} />
    </PullToRefresh>
  );
}
