import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";

import { trpc, createMobileTrpcClient } from "@/lib/trpc";
import { authClient } from "@/lib/auth";
import { registerDeepLinkHandler } from "@/native/deeplink";
import { isNative } from "@/native/platform";

import { SignInScreen } from "@/routes/sign-in";
import { DashboardScreen } from "@/routes/dashboard";
import { CoursesScreen } from "@/routes/courses";

function ProtectedShell({ children }: { children: React.ReactNode }) {
  const session = authClient.useSession();

  if (session.isPending) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }
  if (!session.data?.user) {
    return <Navigate to="/sign-in" replace />;
  }
  return <>{children}</>;
}

export function App() {
  const navigate = useNavigate();
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createMobileTrpcClient());

  useEffect(() => {
    if (!isNative) return;
    const handle = registerDeepLinkHandler(navigate);
    return () => {
      void handle.then((h) => h.remove());
    };
  }, [navigate]);

  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <Routes>
          <Route path="/sign-in" element={<SignInScreen />} />
          <Route
            path="/"
            element={
              <ProtectedShell>
                <DashboardScreen />
              </ProtectedShell>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedShell>
                <CoursesScreen />
              </ProtectedShell>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </trpc.Provider>
    </QueryClientProvider>
  );
}
