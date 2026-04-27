"use client";

import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import Sessions from "./_components/Sessions";

export default function SessionsPage() {
  const q = api.users.getUserSessions.useQuery();
  if (q.isLoading) return <PageLoader />;
  if (!q.data?.success || !q.data.data) {
    return <div>Failed to load sessions data.</div>;
  }
  const { sessions, accounts, currentSessionId } = q.data.data;
  return (
    <Sessions
      sessions={sessions}
      accounts={accounts}
      currentSessionId={currentSessionId}
    />
  );
}
