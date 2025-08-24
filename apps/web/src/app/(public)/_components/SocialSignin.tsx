"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/server/auth/client";
import Image from "next/image";

interface SocialSigninProps {
  isGoogleSignInEnabled: boolean;
  isGithubSignInEnabled: boolean;
  isLoading?: boolean;
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

      const currentUrl = new URL(window.location.href);
      const error = currentUrl.searchParams.get("error");

      if (error) {
        throw new Error(decodeURIComponent(error).replace(/\+/g, " "));
      }

      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });

      if (result?.data && "user" in result.data) {
        window.location.href = "/dashboard";
        return;
      }

      if (result?.data && "url" in result.data && result.data.url) {
        window.location.href = result.data.url;
        return;
      }

      toast.error(result?.error?.message || "Failed to sign in with Google", {
        position: "top-center",
        duration: 3000,
      });
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

      const currentUrl = new URL(window.location.href);
      const error = currentUrl.searchParams.get("error");

      if (error) {
        throw new Error(decodeURIComponent(error).replace(/\+/g, " "));
      }

      const result = await authClient.signIn.social({
        provider: "github",
        callbackURL: "/dashboard",
      });

      if (result?.data && "user" in result.data) {
        window.location.href = "/dashboard";
        return;
      }

      if (result?.data && "url" in result.data && result.data.url) {
        window.location.href = result.data.url;
        return;
      }

      toast.error(result?.error?.message || "Failed to sign in with GitHub", {
        position: "top-center",
        duration: 3000,
      });
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
    <div className="mt-3 flex flex-col gap-3">
      {isGoogleSignInEnabled && (
        <Button
          variant="outline"
          className="flex w-full items-center justify-center gap-2 border-white/30 bg-white/20 backdrop-blur-sm hover:bg-white/30 dark:border-gray-700/50 dark:bg-gray-900/20 dark:hover:bg-gray-800/30"
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
          className="flex w-full items-center justify-center gap-2 border-white/30 bg-white/20 backdrop-blur-sm hover:bg-white/30 dark:border-gray-700/50 dark:bg-gray-900/20 dark:hover:bg-gray-800/30"
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
