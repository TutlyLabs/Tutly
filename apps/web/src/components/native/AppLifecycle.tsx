"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { isNative } from "@/lib/native";

export default function AppLifecycle() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isNative()) return;

    let cancelled = false;
    const listeners: { remove: () => Promise<void> }[] = [];

    const routeFromUrl = (raw: string) => {
      try {
        const url = new URL(raw);
        router.push(`${url.pathname}${url.search}${url.hash}`);
      } catch {
        // Non-URL deep links (e.g. custom schemes) ignored.
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
