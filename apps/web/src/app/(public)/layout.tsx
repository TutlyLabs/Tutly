import "@/styles/globals.css";
import { RefreshCw } from "lucide-react";
import { getVersion } from "@/lib/version";
import ThemeToggle from "@/components/ThemeToggle";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { getServerSession } from "@/lib/auth";
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
    redirect("/dashboard");
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
        <button
          id="checkUpdate"
          className="hover:bg-muted inline-flex items-center gap-1 rounded-md px-1.5 py-0.5"
          title="Check for updates"
        >
          <RefreshCw className="h-3 w-3 transition-transform" />
        </button>
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
