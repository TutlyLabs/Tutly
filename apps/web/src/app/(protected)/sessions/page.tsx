import { api } from "@/trpc/server";
import Sessions from "./_components/Sessions";

export default async function SessionsPage() {
  const sessionsData = await api.users.getUserSessions();

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
