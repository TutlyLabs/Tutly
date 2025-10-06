import "@/styles/globals.css";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { AppHeader } from "@/components/sidebar/AppHeader";
import posthog from "posthog-js";
import { getServerSessionOrRedirect } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { LayoutProvider } from "@/providers/layout-provider";
import { LayoutContent } from "@/components/LayoutContent";
import Crisp from "@/components/Crisp";

interface ProtectedLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default async function ProtectedLayout({
  children,
}: ProtectedLayoutProps) {
  const session = await getServerSessionOrRedirect();

  if (typeof window !== "undefined") {
    posthog.init("phc_fkSt1fQ3v4zrEcSB1TWZMHGA5B0Q0hAB70JlZcINrMU", {
      api_host: "https://us.i.posthog.com",
      person_profiles: "identified_only",
    });
  }

  const isIntegrationsEnabled = await isFeatureEnabled(
    "integrations_tab",
    session.user,
  );

  const isAIAssistantEnabled = await isFeatureEnabled(
    "ai_assistant",
    session.user,
  );

  return (
    <LayoutProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <div>
          <AppSidebar
            user={session.user}
            isIntegrationsEnabled={isIntegrationsEnabled}
            isAIAssistantEnabled={isAIAssistantEnabled}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out">
          <AppHeader user={session.user} />
          <LayoutContent>{children}</LayoutContent>
        </div>
      </div>
      <Crisp user={session.user} organization={session.user.organization} />
    </LayoutProvider>
  );
}
