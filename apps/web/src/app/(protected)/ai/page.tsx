import { redirect } from "next/navigation";
import { getServerSessionOrRedirect } from "@/lib/auth";
import { posthog } from "@/lib/posthog";
import AIChat from "./_components/AIChat";

export default async function AIPage() {
  const session = await getServerSessionOrRedirect();
  const user = session.user;

  if (user.role !== "INSTRUCTOR") {
    redirect("/404");
  }

  const isAIAssistantEnabled = await posthog.isFeatureEnabled(
    "ai_assistant",
    user.id,
  );
  if (!isAIAssistantEnabled) {
    redirect("/404");
  }

  return (
    <div className="h-[88vh] flex-1 overflow-hidden">
      <AIChat user={user} />
    </div>
  );
}
