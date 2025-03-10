"use client";

import { usePathname } from "next/navigation";

import type { SessionUser } from "@tutly/auth";
import { Separator } from "@tutly/ui/separator";

import { useIsMobile } from "~/hooks/use-mobile";
import { DynamicBreadcrumbs } from "./DynamicBreadcrumbs";
// import { ModeToggle } from "../ModeToggle";
// import Notifications from "../Notifications";
import { UserMenu } from "./UserMenu";

interface AppHeaderProps {
  user: SessionUser;
  crumbReplacement?: Record<string, string>;
}

export function AppHeader({ user, crumbReplacement = {} }: AppHeaderProps) {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          {isMobile && (
            <Separator orientation="vertical" className="ml-5 h-4" />
          )}
          <DynamicBreadcrumbs
            pathname={pathname}
            crumbReplacement={crumbReplacement}
          />
        </div>
        <div className="flex items-center gap-3">
          {/* TODO: Remove this once we have a proper role system */}
          <span className="text-md font-medium max-sm:hidden">INSTRUCTOR</span>
          {/* <ModeToggle />
          <Notifications user={user} /> */}
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
