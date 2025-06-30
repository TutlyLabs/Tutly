"use client";

import { api } from "@/trpc/react";
import Sessions from "./_components/Sessions";

export default function SessionsPage() {
  const { data: sessionsData, isLoading } =
    api.users.getUserSessions.useQuery();

  if (isLoading) {
    return <div>Loading sessions...</div>;
  }

  if (!sessionsData?.success || !sessionsData.data) {
    return <div>Failed to load sessions data.</div>;
  }

  const { sessions, accounts, currentSessionId } = sessionsData.data;

  return (
    <div className="mx-auto w-full max-w-[600px] p-6">
      <Sessions
        sessions={sessions}
        accounts={accounts}
        currentSessionId={currentSessionId}
      />
    </div>
  );
}
