"use client";

import { Navigate } from "@/components/auth/Navigate";
import { useAuthSession } from "@/components/auth/ProtectedShell";
import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import { SandboxIntegration } from "./_components/Sandbox";
import { ZoomIntegration } from "./_components/Zoom";
import { GithubIntegration } from "./_components/Github";
import { GoogleIntegration } from "./_components/Google";
import { GeminiIntegration } from "./_components/Gemini";

export default function IntegrationsPage() {
  const { user } = useAuthSession();
  const integrationsEnabledQ = api.featureFlags.isEnabled.useQuery({
    key: "integrations_tab",
  });
  const aiEnabledQ = api.featureFlags.isEnabled.useQuery({
    key: "ai_assistant",
  });
  const featuresQ = api.oauth.getFlagPayload.useQuery({
    key: "integrations_tab",
  });
  const accountsQ = api.oauth.getAccounts.useQuery();

  if (!user || integrationsEnabledQ.isLoading) return <PageLoader />;
  if (!integrationsEnabledQ.data) return <Navigate to="/" />;
  if (featuresQ.isLoading || accountsQ.isLoading) return <PageLoader />;

  const features = featuresQ.data ?? {};
  const accounts = accountsQ.data;

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your favorite tools and services to enhance your Tutly
          experience
        </p>
      </div>

      {features.codesandbox && (
        <SandboxIntegration sandbox={accounts?.sandbox} />
      )}
      {features.zoom && <ZoomIntegration zoom={accounts?.zoom} />}
      {features.github && <GithubIntegration github={accounts?.github} />}
      {features.google && <GoogleIntegration google={accounts?.google} />}
      {features.gemini && aiEnabledQ.data && (
        <GeminiIntegration gemini={accounts?.gemini} />
      )}
    </div>
  );
}
