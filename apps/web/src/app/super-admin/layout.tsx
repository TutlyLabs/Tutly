export const dynamic = "force-dynamic";

import "@/styles/globals.css";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { AppHeader } from "@/components/sidebar/AppHeader";
import { LayoutProvider } from "@/providers/layout-provider";
import { LayoutContent } from "@/components/LayoutContent";
import {
  getServerSessionOrRedirect,
  getBaseDomain,
  getProtocol,
} from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

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

  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const [baseDomain, protocol] = await Promise.all([
    getBaseDomain(),
    getProtocol(),
  ]);
  const expectedAdminHost = `admin.${baseDomain}`;
  const isLocal = process.env.NODE_ENV !== "production";

  if (isLocal ? !host.startsWith("admin.") : host !== expectedAdminHost) {
    redirect(`${protocol}://${expectedAdminHost}/super-admin`);
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
