"use client";

import { ChevronRight, Menu } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { haptics } from "@/lib/haptics";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@tutly/ui/collapsible";
import { SidebarProvider, SidebarTrigger } from "@tutly/ui/sidebar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@tutly/ui/sidebar";
import { getDefaultSidebarItems } from "@/config/sidebar";
import { useIsMobile } from "@tutly/hooks";
import type { SessionUser } from "@/lib/auth";
import { cn } from "@tutly/utils";
import { usePathname } from "next/navigation";
import { useLayout } from "@/providers/layout-provider";

export interface SidebarItem {
  title: string;
  url: string;
  icon: React.ElementType;
  items?: SidebarItem[];
  isActive?: boolean;
  className?: string;
}

interface AppSidebarProps {
  user: SessionUser;
  className?: string;
  isIntegrationsEnabled?: boolean | undefined;
  isAIAssistantEnabled?: boolean | undefined;
}

export function AppSidebar({
  user,
  className,
  isIntegrationsEnabled,
  isAIAssistantEnabled,
}: AppSidebarProps) {
  const { forceClose, hideSidebar } = useLayout();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(() => !forceClose);
  const isMobile = useIsMobile();

  const sidebarItems = getDefaultSidebarItems({
    role: user.role,
    isAdmin: user.isAdmin,
    isIntegrationsEnabled: isIntegrationsEnabled ?? false,
    isAIAssistantEnabled: isAIAssistantEnabled ?? false,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebarOpen");
      if (saved !== null) {
        setIsOpen(forceClose ? false : saved === "true");
      }
    }
  }, [forceClose]);

  const organizationName =
    user.role === "SUPER_ADMIN"
      ? "Tutly Admin"
      : user.organization?.name || "Tutly";
  const organizationLogo = user.organization?.logo || "/logo-with-bg.png";

  const handleOpenChange = (open: boolean) => {
    // On desktop, forceClose pages can't toggle sidebar open.
    // On mobile, the hamburger should always work, even on forceClose pages.
    if (forceClose && !isMobile) return;
    setIsOpen(open);
    if (!isMobile) {
      localStorage.setItem("sidebarOpen", String(open));
    }
  };

  // Mobile sheet always renders expanded; desktop respects collapse state.
  const expanded = isMobile ? true : isOpen;
  const headerCollapsed = isMobile ? false : forceClose;

  const mobileTabs = useMemo(() => {
    if (!pathname) return [];

    const tabs = sidebarItems
      .map((item) => {
        const children: SidebarItem[] = Array.isArray(item.items)
          ? item.items
          : [];
        const hasChildren = children.length > 0;
        const targetUrl =
          item.url && item.url !== "#"
            ? item.url
            : hasChildren
              ? children[0]?.url
              : "#";
        if (!targetUrl || targetUrl === "#") return null;
        const isSubActive = hasChildren
          ? children.some(
              (s) =>
                s.url && (pathname === s.url || pathname.startsWith(s.url)),
            )
          : false;
        const isRootActive =
          item.url && item.url !== "#"
            ? pathname === item.url || pathname.startsWith(item.url)
            : false;
        const active = Boolean(isSubActive || isRootActive || item.isActive);
        return {
          title: item.title,
          url: targetUrl,
          icon: item.icon,
          active,
        };
      })
      .filter(Boolean) as Array<{
      title: string;
      url: string;
      icon: React.ElementType;
      active: boolean;
    }>;

    return tabs.slice(0, 5);
  }, [sidebarItems, pathname]);

  if (hideSidebar) return null;

  return (
    <div
      className={cn(
        "flex-shrink-0 overflow-hidden transition-all duration-100 ease-in-out",
        {
          "sm:w-[212px]": isOpen && !forceClose,
          "sm:w-[50px]": !isOpen || forceClose,
        },
      )}
    >
      <SidebarProvider
        onOpenChange={handleOpenChange}
        open={isMobile ? isOpen : isOpen && !forceClose}
      >
        {isMobile && (
          <div
            className="fixed left-2 z-50 flex items-center"
            style={{
              top: "env(safe-area-inset-top)",
              height: "3.5rem",
            }}
          >
            <SidebarTrigger
              aria-label="Open menu"
              className="text-foreground/80 hover:bg-accent hover:text-foreground h-9 w-9 rounded-full [&_svg]:!size-5"
            >
              <Menu />
            </SidebarTrigger>
          </div>
        )}
        <Sidebar
          collapsible={isMobile ? "offcanvas" : "icon"}
          className={cn("bg-background h-screen", className)}
        >
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <div
                  className={cn(
                    "flex w-full items-center justify-between gap-2",
                    expanded ? "flex-row" : "flex-col",
                  )}
                >
                  <SidebarMenuButton size="lg" asChild className="mx-auto">
                    <Link href="/dashboard" aria-label="Go to dashboard">
                      <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg">
                        <img
                          src={organizationLogo}
                          alt="Logo"
                          width={32}
                          height={32}
                          className="h-full w-full rounded-md object-cover"
                        />
                      </div>
                      {!headerCollapsed && expanded && (
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">
                            {organizationName}
                          </span>
                          <span className="truncate text-xs">{user.role}</span>
                        </div>
                      )}
                    </Link>
                  </SidebarMenuButton>
                  {!headerCollapsed && !isMobile && <SidebarTrigger />}
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu>
                {sidebarItems.map((item) => {
                  const ItemIcon = item.icon;
                  const matchPath = (url: string | undefined) => {
                    if (!url || url === "#") return false;
                    return pathname === url || pathname.startsWith(url + "/");
                  };
                  const isItemActive = matchPath(item.url);
                  const isSubItemActive =
                    item.items?.some((subItem) => matchPath(subItem.url)) ??
                    false;
                  return (
                    <Collapsible
                      key={item.title}
                      asChild
                      defaultOpen={
                        item.isActive ??
                        (item.url
                          ? pathname.startsWith(item.url)
                          : undefined) ??
                        isSubItemActive
                      }
                      className={`group/collapsible ${item.className ?? ""}`}
                    >
                      <SidebarMenuItem>
                        {item.items ? (
                          <>
                            {expanded ? (
                              <CollapsibleTrigger asChild>
                                <SidebarMenuButton
                                  className={cn(
                                    pathname === item.url
                                      ? "bg-primary text-primary-foreground"
                                      : "",
                                    "hover:bg-primary/90 hover:text-primary-foreground m-auto flex cursor-pointer items-center gap-4 rounded px-5 py-5 text-base",
                                  )}
                                >
                                  <ItemIcon className="size-6" />
                                  <span>{item.title}</span>
                                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                </SidebarMenuButton>
                              </CollapsibleTrigger>
                            ) : (
                              <SidebarMenuButton
                                tooltip={{
                                  children: (
                                    <div className="flex w-[180px] flex-col py-1">
                                      <div className="text-muted-foreground px-3 pt-1 pb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                                        {item.title}
                                      </div>
                                      {item.items?.map((subItem) => (
                                        <Link
                                          key={subItem.title}
                                          href={subItem.url}
                                          className={cn(
                                            "relative flex items-center px-3 py-1.5 text-sm outline-none select-none transition-colors",
                                            matchPath(subItem.url)
                                              ? "bg-accent text-accent-foreground font-medium"
                                              : "text-popover-foreground hover:bg-accent hover:text-accent-foreground",
                                            "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                          )}
                                        >
                                          <span className="truncate">
                                            {subItem.title}
                                          </span>
                                        </Link>
                                      ))}
                                    </div>
                                  ),
                                  className:
                                    "!bg-popover !text-popover-foreground border shadow-lg p-0",
                                  side: "right",
                                  sideOffset: 8,
                                  align: "start",
                                  hideArrow: true,
                                }}
                                className={cn(
                                  isItemActive || isSubItemActive
                                    ? "bg-primary text-primary-foreground"
                                    : "",
                                  isSubItemActive &&
                                    !expanded &&
                                    "bg-accent text-accent-foreground",
                                  "hover:bg-primary/90 hover:text-primary-foreground m-auto flex cursor-pointer items-center gap-4 rounded px-5 py-5 text-base",
                                )}
                              >
                                <ItemIcon className="size-6" />
                              </SidebarMenuButton>
                            )}
                            {expanded && (
                              <CollapsibleContent>
                                <SidebarMenuSub>
                                  {item.items?.map((subItem) => (
                                    <SidebarMenuSubItem key={subItem.title}>
                                      <SidebarMenuSubButton
                                        asChild
                                        className={cn(
                                          matchPath(subItem.url)
                                            ? "bg-primary text-primary-foreground"
                                            : "",
                                          "hover:bg-primary/90 hover:text-primary-foreground m-auto flex cursor-pointer items-center gap-4 rounded px-5 py-5 text-base",
                                          subItem.className ?? "",
                                        )}
                                      >
                                        <Link href={subItem.url}>
                                          <span>{subItem.title}</span>
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            )}
                          </>
                        ) : (
                          <Link href={item.url}>
                            <SidebarMenuButton
                              tooltip={expanded ? "" : item.title}
                              className={cn(
                                pathname === item.url
                                  ? "bg-primary text-primary-foreground"
                                  : "",
                                "hover:bg-primary/90 hover:text-primary-foreground m-auto flex cursor-pointer items-center gap-4 rounded px-5 py-5 text-base",
                              )}
                            >
                              <ItemIcon className="size-6" />
                              {expanded && <span>{item.title}</span>}
                            </SidebarMenuButton>
                          </Link>
                        )}
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {isMobile && mobileTabs.length > 0 && (
          <nav className="bg-background/80 supports-[backdrop-filter]:bg-background/60 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur">
            <ul className="flex items-stretch justify-between pt-1 pr-[max(0.25rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.25rem,env(safe-area-inset-left))]">
              {mobileTabs.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <li key={tab.title} className="flex-1">
                    <Link
                      href={tab.url}
                      onClick={() => void haptics.light()}
                      aria-current={tab.active ? "page" : undefined}
                      className={cn(
                        "group relative flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
                        tab.active
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full transition-all",
                          tab.active ? "bg-primary opacity-100" : "opacity-0",
                        )}
                      />
                      <div
                        className={cn(
                          "grid size-9 place-items-center rounded-full transition-colors",
                          tab.active ? "bg-primary/10" : "",
                        )}
                      >
                        <TabIcon className="size-5" />
                      </div>
                      <span className="leading-none">{tab.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </SidebarProvider>
    </div>
  );
}
