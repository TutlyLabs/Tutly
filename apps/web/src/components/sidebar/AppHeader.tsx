"use client";

import Link from "next/link";
import Image from "next/image";
import { useIsMobile } from "@tutly/hooks";
import type { SessionUser } from "@/lib/auth";
import { useLayout } from "@/providers/layout-provider";
import { useState, useEffect } from "react";

import { ModeToggle } from "../ModeToggle";
import { DynamicBreadcrumbs } from "./DynamicBreadcrumbs";
import { UserMenu } from "./UserMenu";
import Notifications from "../Notifications";
import { CommandPalette, CommandPaletteTrigger } from "../CommandPalette";
import { usePathname } from "next/navigation";

interface AppHeaderProps {
  user: SessionUser;
  crumbReplacement?: Record<string, string>;
}

export function AppHeader({ user, crumbReplacement = {} }: AppHeaderProps) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const { hideHeader } = useLayout();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (hideHeader) {
    return null;
  }

  return (
    <>
      <header
        className={[
          "bg-background/85 supports-[backdrop-filter]:bg-background/65",
          "sticky top-0 z-40 flex shrink-0 items-center backdrop-blur",
          "h-[calc(3.5rem+env(safe-area-inset-top))] sm:h-[calc(4rem+env(safe-area-inset-top))]",
          "border-b border-border/80",
          "pt-[env(safe-area-inset-top)]",
          "pr-[max(0.5rem,env(safe-area-inset-right))] pl-[max(0.5rem,env(safe-area-inset-left))]",
          "sm:pr-[max(1rem,env(safe-area-inset-right))] sm:pl-[max(1rem,env(safe-area-inset-left))]",
        ].join(" ")}
      >
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center pl-12 sm:pl-1">
            {isMobile ? (
              <Link
                href="/dashboard"
                aria-label="Tutly home"
                className="flex items-center select-none"
              >
                <Image
                  src="/icon.png"
                  alt="Tutly"
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-lg object-contain"
                  priority
                />
              </Link>
            ) : (
              <DynamicBreadcrumbs
                pathname={pathname}
                crumbReplacement={crumbReplacement}
              />
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-5">
            {!isMobile && (
              <CommandPaletteTrigger
                onClick={() => setCommandPaletteOpen(true)}
                className="w-[260px]"
              />
            )}
            {user.role && (
              <span className="text-foreground hidden text-base font-medium tracking-wide sm:inline-block">
                {user.role}
              </span>
            )}
            <ModeToggle />
            <Notifications user={user} />
            <UserMenu user={user} />
          </div>
        </div>
      </header>
      <CommandPalette
        user={user}
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </>
  );
}
