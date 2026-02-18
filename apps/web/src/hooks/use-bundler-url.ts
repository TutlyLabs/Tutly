"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

/**
 * A hook that returns the bundler URL from query parameters or environment variables
 *
 * Priority order:
 * 1. Query parameter "bundler"
 * 2. Environment variable NEXT_PUBLIC_SANDPACK_BUNDLER_URL
 * 3. undefined
 *
 * @returns The bundler URL or undefined
 */
export function useBundlerUrl(): string | undefined {
  const searchParams = useSearchParams();

  return useMemo(() => {
    // Check for bundler query parameter first
    const bundlerParam = searchParams?.get("bundler");
    if (bundlerParam) {
      return bundlerParam;
    }

    // Fall back to environment variable
    return process.env.NEXT_PUBLIC_SANDPACK_BUNDLER_URL;
  }, [searchParams]);
}
