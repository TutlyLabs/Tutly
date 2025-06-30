import "@/styles/globals.css";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { AppHeader } from "@/components/sidebar/AppHeader";
import posthog from "posthog-js";
import { getServerSessionOrRedirect } from "@/lib/auth";

interface ProtectedLayoutProps {
  children: React.ReactNode;
  title?: string;
  forceClose?: boolean;
}

export default async function ProtectedLayout({
  children,
  forceClose = false,
}: ProtectedLayoutProps) {
  const session = await getServerSessionOrRedirect();

  if (typeof window !== "undefined") {
    posthog.init("phc_fkSt1fQ3v4zrEcSB1TWZMHGA5B0Q0hAB70JlZcINrMU", {
      api_host: "https://us.i.posthog.com",
      person_profiles: "identified_only",
    });
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div>
        <AppSidebar user={session.user} forceClose={forceClose} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out">
        <AppHeader user={session.user} />
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  );
}
