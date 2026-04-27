"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { useLayout } from "@/providers/layout-provider";
import { cn } from "@tutly/utils";

interface LayoutContentProps {
  children: React.ReactNode;
}

export function LayoutContent({ children }: LayoutContentProps) {
  const { className } = useLayout();
  const mainRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastKey = useRef<string | null>(null);

  // Reset scroll on route change so users always start at the top of a new page.
  useEffect(() => {
    const key = `${pathname}?${searchParams.toString()}`;
    if (lastKey.current !== null && lastKey.current !== key) {
      mainRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    }
    lastKey.current = key;
  }, [pathname, searchParams]);

  return (
    <main
      id="main-content"
      ref={mainRef}
      className={cn(
        "flex-1 overflow-auto p-4 sm:p-6 pb-[calc(env(safe-area-inset-bottom)+72px)] sm:pb-6",
        className,
      )}
    >
      <a
        href="#main-content"
        className="bg-primary text-primary-foreground sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:px-3 focus:py-1.5 focus:text-sm focus:font-medium focus:shadow-md"
      >
        Skip to content
      </a>
      {children}
    </main>
  );
}
