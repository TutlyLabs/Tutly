"use client";

import { Suspense } from "react";

import "@/styles/globals.css";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { AppHeader } from "@/components/sidebar/AppHeader";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { LayoutProvider } from "@/providers/layout-provider";
import { LayoutContent } from "@/components/LayoutContent";
import Crisp from "@/components/Crisp";
import PageLoader from "@/components/loader/PageLoader";
import { ProtectedShell } from "@/components/auth/ProtectedShell";
import { authClient } from "@/server/auth/client";
import { api } from "@/trpc/react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedShell>
      <ProtectedLayoutContent>{children}</ProtectedLayoutContent>
    </ProtectedShell>
  );
}

function ProtectedLayoutContent({ children }: { children: React.ReactNode }) {
  const { data } = authClient.useSession();
  const integrationsQ = api.featureFlags.isEnabled.useQuery({
    key: "integrations_tab",
  });
  const aiAssistantQ = api.featureFlags.isEnabled.useQuery({
    key: "ai_assistant",
  });

  if (!data?.user) return <PageLoader />;
  const user = data.user;
  const isImpersonating = (data.session as { impersonatedBy?: string } | null)
    ?.impersonatedBy;

  return (
    <LayoutProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <div>
          <AppSidebar
            user={user}
            isIntegrationsEnabled={integrationsQ.data ?? false}
            isAIAssistantEnabled={aiAssistantQ.data ?? false}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out">
          {isImpersonating && <ImpersonationBanner user={user} />}
          <AppHeader user={user} />
          <LayoutContent>
            <Suspense fallback={<PageLoader />}>{children}</Suspense>
          </LayoutContent>
        </div>
      </div>
      <Crisp user={user} organization={user.organization} />
    </LayoutProvider>
  );
}
