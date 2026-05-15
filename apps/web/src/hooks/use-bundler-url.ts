"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

function isValidBundlerUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
  } catch {
    return false;
  }
}

// Cache-bust the bundler URL per build.
const BUNDLER_VERSION = process.env.NEXT_PUBLIC_SANDPACK_VERSION || "";

function withVersion(url: string | undefined): string | undefined {
  if (!url || !BUNDLER_VERSION) return url;
  return url.includes("?")
    ? `${url}&v=${BUNDLER_VERSION}`
    : `${url}?v=${BUNDLER_VERSION}`;
}

// Clear stale bundler service workers once per session.
let swCleanupDone = false;
function cleanupStaleServiceWorkers() {
  if (swCleanupDone || typeof navigator === "undefined") return;
  swCleanupDone = true;
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => {
      const url = r.active?.scriptURL || r.installing?.scriptURL || "";
      if (url.includes("sandpack") || url.includes("sandbox-service-worker")) {
        r.unregister();
      }
    });
  });
}

export function useBundlerUrl(): string | undefined {
  const searchParams = useSearchParams();

  useEffect(() => {
    cleanupStaleServiceWorkers();
  }, []);

  return useMemo(() => {
    const bundlerParam = searchParams?.get("bundler");
    if (bundlerParam && isValidBundlerUrl(bundlerParam)) {
      return bundlerParam;
    }
    return withVersion(process.env.NEXT_PUBLIC_SANDPACK_BUNDLER_URL);
  }, [searchParams]);
}
