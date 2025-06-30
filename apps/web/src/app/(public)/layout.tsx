import "@/styles/globals.css";
import { RefreshCw } from "lucide-react";
import { getVersion } from "@/lib/version";
import ThemeToggle from "@/components/ThemeToggle";
import posthog from "posthog-js";

type Props = {
  children: React.ReactNode;
};

export default function AuthLayout({ children }: Props) {
  const version = getVersion();

  if (typeof window !== "undefined") {
    posthog.init("phc_fkSt1fQ3v4zrEcSB1TWZMHGA5B0Q0hAB70JlZcINrMU", {
      api_host: "https://us.i.posthog.com",
      person_profiles: "identified_only",
    });
  }

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
      {children}
    </>
  );
}
