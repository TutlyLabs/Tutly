export const dynamic = "force-dynamic";

import "@/styles/globals.css";
import { getVersion } from "@/lib/version";
import ThemeToggle from "@/components/ThemeToggle";
import { isFeatureEnabled } from "@/lib/featureFlags";
import {
  getServerSession,
  getPostLoginRedirectUrl,
  getSyncRedirectUrl,
} from "@/lib/auth";
import { FeatureFlagsProvider } from "./_components/FeatureFlagsProvider";
import { redirect } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

export default async function AuthLayout({ children }: Props) {
  const version = getVersion();
  const session = await getServerSession();
  const currentUser = session?.user;

  if (currentUser) {
    const redirectUrl = await getPostLoginRedirectUrl(currentUser);
    const syncUrl = await getSyncRedirectUrl(redirectUrl);
    redirect(syncUrl);
  }

  const isGoogleSignInEnabled = await isFeatureEnabled(
    "google_sign_in",
    currentUser || { id: "unauthenticated", role: "STUDENT" },
  );

  const isGithubSignInEnabled = await isFeatureEnabled(
    "github_sign_in",
    currentUser || { id: "unauthenticated", role: "STUDENT" },
  );

  return (
    <>
      <div className="text-muted-foreground fixed bottom-2 left-2 flex items-center gap-1.5 px-2 text-xs">
        <span>{version}</span>
      </div>
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>
      <FeatureFlagsProvider
        isGoogleSignInEnabled={isGoogleSignInEnabled || false}
        isGithubSignInEnabled={isGithubSignInEnabled || false}
      >
        {children}
      </FeatureFlagsProvider>
    </>
  );
}
