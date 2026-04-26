"use client";

import "@/styles/globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import { Navigate } from "@/components/auth/Navigate";
import { useAuthSession } from "@/components/auth/ProtectedShell";
import { FeatureFlagsProvider } from "./_components/FeatureFlagsProvider";
import { api } from "@/trpc/react";
import { getVersion } from "@/lib/version";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isPending } = useAuthSession();
  const googleQ = api.featureFlags.isEnabled.useQuery({
    key: "google_sign_in",
  });
  const githubQ = api.featureFlags.isEnabled.useQuery({
    key: "github_sign_in",
  });

  if (!isPending && user) return <Navigate to="/dashboard" />;

  return (
    <>
      <div className="text-muted-foreground fixed bottom-2 left-2 flex items-center gap-1.5 px-2 text-xs">
        <span>{getVersion()}</span>
      </div>
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>
      <FeatureFlagsProvider
        isGoogleSignInEnabled={googleQ.data ?? false}
        isGithubSignInEnabled={githubQ.data ?? false}
      >
        {children}
      </FeatureFlagsProvider>
    </>
  );
}
