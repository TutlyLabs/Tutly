"use client";

import { authClient } from "@/server/auth/client";
import PageLoader from "@/components/loader/PageLoader";
import { Navigate } from "./Navigate";

// Wraps any subtree that requires authentication. Mirrors what
// getServerSessionOrRedirect() did server-side, but reactively on the client.
// Re-renders on session change because better-auth's useSession is reactive.
export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { data, isPending } = authClient.useSession();

  if (isPending) return <PageLoader />;
  if (!data?.user) return <Navigate to="/sign-in" />;
  return <>{children}</>;
}

// Hook variant for pages that need the user object directly.
export function useAuthSession() {
  const { data, isPending } = authClient.useSession();
  return {
    user: data?.user ?? null,
    session: data?.session ?? null,
    isPending,
  };
}
