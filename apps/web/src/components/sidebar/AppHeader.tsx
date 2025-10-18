"use client";

import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
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
      <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 flex h-16 shrink-0 items-center gap-1 border-b px-2 backdrop-blur sm:gap-2 sm:px-4">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-1 pl-4 sm:gap-2 sm:pl-0">
            {isMobile && (
              <Separator orientation="vertical" className="ml-3 h-4 sm:ml-5" />
            )}
            <DynamicBreadcrumbs
              pathname={pathname}
              crumbReplacement={crumbReplacement}
            />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            {!isMobile && (
              <CommandPaletteTrigger
                onClick={() => setCommandPaletteOpen(true)}
                className="max-w-[200px]"
              />
            )}
            <span className="text-md font-medium max-sm:hidden">
              {user.role}
            </span>
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
