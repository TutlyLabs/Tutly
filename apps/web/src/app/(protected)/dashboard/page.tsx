"use client";

import Dashboard from "./_components/dashboard";
import { Navigate } from "@/components/auth/Navigate";
import { useAuthSession } from "@/components/auth/ProtectedShell";

export default function DashboardPage() {
  const { user } = useAuthSession();
  if (!user) return null;
  if (user.role === "SUPER_ADMIN") return <Navigate to="/super-admin" />;
  return <Dashboard name={user.name} currentUser={user} />;
}
