"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@tutly/ui/button";
import { authClient } from "@/server/auth/client";
import { isNative } from "@/lib/native";
import Image from "next/image";

const NATIVE_OAUTH_BASE =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://learn.tutly.in";

interface SocialSigninProps {
  isGoogleSignInEnabled: boolean;
  isGithubSignInEnabled: boolean;
  isLoading?: boolean;
}

async function startSocialSignIn(provider: "google" | "github") {
  if (isNative()) {
    const url = new URL(`${NATIVE_OAUTH_BASE}/auth/native-oauth-start`);
    url.searchParams.set("provider", provider);
    url.searchParams.set("next", "/auth/post-login");
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: url.toString(), presentationStyle: "popover" });
    return;
  }

  await authClient.signIn.social({
    provider,
    callbackURL: "/auth/post-login",
  });
}

export function SocialSignin({
  isGoogleSignInEnabled,
  isGithubSignInEnabled,
  isLoading = false,
}: SocialSigninProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      await startSocialSignIn("google");
    } catch (error) {
      toast.error("Failed to initiate Google sign in", {
        duration: 3000,
        position: "top-center",
      });
      console.error("Error during Google sign in:", error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    try {
      setIsGithubLoading(true);
      await startSocialSignIn("github");
    } catch (error) {
      toast.error("Failed to initiate GitHub sign in", {
        duration: 3000,
        position: "top-center",
      });
      console.error("Error during GitHub sign in:", error);
    } finally {
      setIsGithubLoading(false);
    }
  };

  if (!isGoogleSignInEnabled && !isGithubSignInEnabled) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="relative">
        <div className="border-border absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-[11px] tracking-wide uppercase">
          <span className="bg-card text-muted-foreground px-2">
            Or continue with
          </span>
        </div>
      </div>
      {isGoogleSignInEnabled && (
        <Button
          variant="outline"
          className="bg-background hover:bg-accent flex h-10 w-full items-center justify-center gap-2 text-sm"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading}
        >
          <Image
            src="/integrations/google.png"
            alt="Google logo"
            width={20}
            height={20}
          />
          {isGoogleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isGoogleLoading ? "Connecting..." : "Continue with Google"}
        </Button>
      )}
      {isGithubSignInEnabled && (
        <Button
          variant="outline"
          className="bg-background hover:bg-accent flex h-10 w-full items-center justify-center gap-2 text-sm"
          onClick={handleGithubSignIn}
          disabled={isGithubLoading || isLoading}
        >
          <Image
            src="/integrations/github.png"
            alt="GitHub logo"
            width={20}
            height={20}
            className="rounded-full bg-white"
          />
          {isGithubLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isGithubLoading ? "Connecting..." : "Continue with GitHub"}
        </Button>
      )}
    </div>
  );
}
