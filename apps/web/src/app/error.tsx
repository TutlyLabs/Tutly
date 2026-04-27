"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="bg-destructive/10 text-destructive mb-5 flex h-16 w-16 items-center justify-center rounded-2xl">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
        Something went wrong
      </h1>
      <p className="text-muted-foreground mt-2 max-w-md text-center text-sm sm:text-base">
        We hit an unexpected error. The team has been notified — try again or
        return home.
      </p>
      {error.digest && (
        <p className="text-muted-foreground/70 mt-2 font-mono text-[11px]">
          Error ID: {error.digest}
        </p>
      )}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-5 text-sm font-medium transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/"
          className="bg-card hover:bg-accent text-foreground inline-flex h-10 items-center justify-center rounded-md border px-5 text-sm font-medium transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
