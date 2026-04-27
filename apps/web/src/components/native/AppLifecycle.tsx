"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { isNative } from "@/lib/native";

const BEARER_TOKEN_KEY = "bearer_token";

export default function AppLifecycle() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isNative()) return;

    let cancelled = false;
    const listeners: { remove: () => Promise<void> }[] = [];

    const handleAuthCallback = async (url: URL) => {
      const error = url.searchParams.get("error");
      const token = url.searchParams.get("token");
      const next = url.searchParams.get("next") ?? "/auth/post-login";

      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.close();
      } catch {
        // ignore — browser may already be closed
      }

      if (error || !token) {
        toast.error("Sign-in failed. Please try again.");
        router.push("/sign-in");
        return;
      }

      window.localStorage.setItem(BEARER_TOKEN_KEY, token);
      await queryClient.invalidateQueries();
      router.push(next);
    };

    const routeFromUrl = (raw: string) => {
      try {
        const url = new URL(raw);
        if (url.protocol === "tutly:" && url.host === "auth") {
          void handleAuthCallback(url);
          return;
        }
        router.push(`${url.pathname}${url.search}${url.hash}`);
      } catch {
        // ignore non-URL deep links
      }
    };

    void (async () => {
      const { App } = await import("@capacitor/app");
      if (cancelled) return;

      const launch = await App.getLaunchUrl();
      if (launch?.url) routeFromUrl(launch.url);

      listeners.push(
        await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) window.history.back();
          else void App.exitApp();
        }),
        await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) void queryClient.invalidateQueries();
        }),
        await App.addListener("appUrlOpen", (event) => routeFromUrl(event.url)),
      );
    })();

    return () => {
      cancelled = true;
      for (const l of listeners) void l.remove();
    };
  }, [router, queryClient]);

  return null;
}
