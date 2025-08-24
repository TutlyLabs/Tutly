"use client";

import { useLayout } from "@/providers/layout-provider";
import { cn } from "@/lib/utils";

interface LayoutContentProps {
  children: React.ReactNode;
}

export function LayoutContent({ children }: LayoutContentProps) {
  const { className } = useLayout();

  return (
    <main className={cn("flex-1 overflow-auto p-4", className)}>
      {children}
    </main>
  );
}
