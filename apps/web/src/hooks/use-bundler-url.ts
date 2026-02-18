"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

function isValidBundlerUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Returns bundler URL from query param or env variable.
 * Priority: ?bundler → NEXT_PUBLIC_SANDPACK_BUNDLER_URL → undefined
 */
export function useBundlerUrl(): string | undefined {
  const searchParams = useSearchParams();

  return useMemo(() => {
    const bundlerParam = searchParams?.get("bundler");
    if (bundlerParam && isValidBundlerUrl(bundlerParam)) {
      return bundlerParam;
    }

    return process.env.NEXT_PUBLIC_SANDPACK_BUNDLER_URL;
  }, [searchParams]);
}
