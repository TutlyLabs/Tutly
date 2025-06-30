"use client";

import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SessionUser } from "@/lib/auth";

import { ModeToggle } from "../ModeToggle";
import { DynamicBreadcrumbs } from "./DynamicBreadcrumbs";
import { UserMenu } from "./UserMenu";
import Notifications from "../Notifications";
import { usePathname } from "next/navigation";

interface AppHeaderProps {
  user: SessionUser;
  crumbReplacement?: Record<string, string>;
}

export function AppHeader({ user, crumbReplacement = {} }: AppHeaderProps) {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  return (
    <header className="bg-background sticky top-0 z-50 flex h-16 shrink-0 items-center gap-1 border-b px-2 transition-all duration-300 ease-in-out sm:gap-2 sm:px-4">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-2">
          {isMobile && (
            <Separator orientation="vertical" className="ml-3 h-4 sm:ml-5" />
          )}
          <DynamicBreadcrumbs
            pathname={pathname}
            crumbReplacement={crumbReplacement}
          />
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <span className="text-md font-medium max-sm:hidden">{user.role}</span>
          <ModeToggle />
          <Notifications user={user} />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
