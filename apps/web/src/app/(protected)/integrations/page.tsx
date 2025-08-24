import { redirect } from "next/navigation";
import { getServerSessionOrRedirect } from "@/lib/auth";
import { posthog } from "@/lib/posthog";
import { SandboxIntegration } from "./_components/Sandbox";
import { ZoomIntegration } from "./_components/Zoom";
import { GithubIntegration } from "./_components/Github";
import { GoogleIntegration } from "./_components/Google";
import { GeminiIntegration } from "./_components/Gemini";
import { db } from "@/lib/db";

export default async function IntegrationsPage() {
  const session = await getServerSessionOrRedirect();
  const currentUser = session.user;

  const isIntegrationsEnabled = await posthog.isFeatureEnabled(
    "integrations_tab",
    currentUser.id,
  );
  if (!isIntegrationsEnabled) {
    redirect("/");
  }

  const features = (await posthog.getFeatureFlagPayload(
    "integrations_tab",
    currentUser.id,
  )) as
    | {
        codesandbox?: boolean;
        github?: boolean;
        google?: boolean;
        zoom?: boolean;
        gemini?: boolean;
      }
    | undefined;

  const isAIAssistantEnabled = await posthog.isFeatureEnabled(
    "ai_assistant",
    currentUser.id,
  );

  const sandbox = await db.account.findFirst({
    where: {
      userId: currentUser.id,
      providerId: "codesandbox",
    },
  });

  if (sandbox?.accessToken) {
    const token = sandbox.accessToken;
    if (token.length > 6) {
      sandbox.accessToken =
        token.slice(0, 7) + "*".repeat(25) + token.slice(-3);
    } else {
      sandbox.accessToken = "*".repeat(token.length);
    }
  }

  const github = await db.account.findFirst({
    where: {
      userId: currentUser.id,
      providerId: "github",
    },
  });

  const google = await db.account.findFirst({
    where: {
      userId: currentUser.id,
      providerId: "google",
    },
  });

  const zoom = await db.account.findFirst({
    where: {
      userId: currentUser.id,
      providerId: "zoom",
    },
  });

  const gemini = await db.account.findFirst({
    where: {
      userId: currentUser.id,
      providerId: "gemini",
    },
  });

  if (gemini?.accessToken) {
    const token = gemini.accessToken;
    if (token.length > 6) {
      gemini.accessToken = token.slice(0, 7) + "*".repeat(25) + token.slice(-3);
    } else {
      gemini.accessToken = "*".repeat(token.length);
    }
  }

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your favorite tools and services to enhance your Tutly
          experience
        </p>
      </div>

      {features?.codesandbox && (
        <SandboxIntegration sandbox={sandbox ?? undefined} />
      )}
      {features?.zoom && <ZoomIntegration zoom={zoom ?? undefined} />}
      {features?.github && <GithubIntegration github={github ?? undefined} />}
      {features?.google && <GoogleIntegration google={google ?? undefined} />}
      {features?.gemini && isAIAssistantEnabled && (
        <GeminiIntegration gemini={gemini ?? undefined} />
      )}
    </div>
  );
}
