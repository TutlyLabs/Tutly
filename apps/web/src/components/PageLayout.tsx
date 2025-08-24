"use client";

import { useLayoutOptions } from "@/hooks/use-layout-options";
import type { ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
  hideHeader?: boolean;
  hideCrisp?: boolean;
  forceClose?: boolean;
  className?: string;
}

export function PageLayout({
  children,
  hideHeader = false,
  hideCrisp = false,
  forceClose = false,
  className,
}: PageLayoutProps) {
  useLayoutOptions({
    hideHeader,
    hideCrisp,
    forceClose,
    className,
  });

  return <>{children}</>;
}
