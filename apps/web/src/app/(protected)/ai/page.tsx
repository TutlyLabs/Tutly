"use client";

import { Navigate } from "@/components/auth/Navigate";
import { useAuthSession } from "@/components/auth/ProtectedShell";
import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import AIChat from "./_components/AIChat";

export default function AIPage() {
  const { user } = useAuthSession();
  const aiQ = api.featureFlags.isEnabled.useQuery({ key: "ai_assistant" });

  if (!user || aiQ.isLoading) return <PageLoader />;
  if (user.role !== "INSTRUCTOR" || !aiQ.data) return <Navigate to="/404" />;

  return (
    <div className="h-[88vh] flex-1 overflow-hidden">
      <AIChat user={user} />
    </div>
  );
}
