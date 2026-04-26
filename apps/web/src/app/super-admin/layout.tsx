"use client";

import "@/styles/globals.css";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { AppHeader } from "@/components/sidebar/AppHeader";
import { LayoutProvider } from "@/providers/layout-provider";
import { LayoutContent } from "@/components/LayoutContent";
import { Navigate } from "@/components/auth/Navigate";
import {
  ProtectedShell,
  useAuthSession,
} from "@/components/auth/ProtectedShell";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedShell>
      <SuperAdminContent>{children}</SuperAdminContent>
    </ProtectedShell>
  );
}

function SuperAdminContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuthSession();
  if (!user) return null;
  if (user.role !== "SUPER_ADMIN") return <Navigate to="/dashboard" />;

  return (
    <LayoutProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <div>
          <AppSidebar user={user} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out">
          <AppHeader user={user} />
          <LayoutContent>{children}</LayoutContent>
        </div>
      </div>
    </LayoutProvider>
  );
}
