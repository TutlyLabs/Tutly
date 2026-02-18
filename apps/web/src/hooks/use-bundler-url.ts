"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

/**
 * Validates if a URL has a valid HTTP or HTTPS protocol
 * Note: This only validates the protocol, not other URL components like hostname or path
 * @param url The URL to validate
 * @returns true if the URL has http: or https: protocol, false otherwise
 */
function isValidBundlerUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    // Allow http and https protocols
    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * A hook that returns the bundler URL from query parameters or environment variables
 *
 * Priority order:
 * 1. Query parameter "bundler" (if valid URL with http/https protocol)
 * 2. Environment variable NEXT_PUBLIC_SANDPACK_BUNDLER_URL
 * 3. undefined
 *
 * @example
 * // Use in a component
 * const bundlerUrl = useBundlerUrl();
 * 
 * // In browser, navigate to:
 * // /playground?bundler=https://bundler.tutly.in/
 *
 * @returns The bundler URL or undefined
 */
export function useBundlerUrl(): string | undefined {
  const searchParams = useSearchParams();

  return useMemo(() => {
    // Check for bundler query parameter first
    const bundlerParam = searchParams?.get("bundler");
    if (bundlerParam && isValidBundlerUrl(bundlerParam)) {
      return bundlerParam;
    }

    // Fall back to environment variable
    return process.env.NEXT_PUBLIC_SANDPACK_BUNDLER_URL;
  }, [searchParams]);
}
