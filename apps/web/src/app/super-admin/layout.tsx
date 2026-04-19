export const dynamic = "force-dynamic";

import "@/styles/globals.css";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { AppHeader } from "@/components/sidebar/AppHeader";
import { LayoutProvider } from "@/providers/layout-provider";
import { LayoutContent } from "@/components/LayoutContent";
import { getServerSessionOrRedirect } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSessionOrRedirect();

  // Only SUPER_ADMIN role can access
  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <LayoutProvider>
      <div className="flex h-screen w-full overflow-hidden">
        <div>
          <AppSidebar user={session.user} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out">
          <AppHeader user={session.user} />
          <LayoutContent>{children}</LayoutContent>
        </div>
      </div>
    </LayoutProvider>
  );
}
