"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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
} from "@/components/ui/sidebar";
import { getDefaultSidebarItems } from "@/config/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
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
  isIntegrationsEnabled: boolean | undefined;
  isAIAssistantEnabled: boolean | undefined;
}

export function AppSidebar({
  user,
  className,
  isIntegrationsEnabled,
  isAIAssistantEnabled,
}: AppSidebarProps) {
  const { forceClose } = useLayout();
  const organizationName = "Tutly";

  const pathname = usePathname();
  const sidebarItems = getDefaultSidebarItems({
    role: user.role,
    isAdmin: user.isAdmin,
    isIntegrationsEnabled: isIntegrationsEnabled ?? false,
    isAIAssistantEnabled: isAIAssistantEnabled ?? false,
  });
  const [isOpen, setIsOpen] = useState(() => !forceClose);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebarOpen");
      if (saved !== null) {
        setIsOpen(forceClose ? false : saved === "true");
      }
    }
  }, [forceClose]);

  const handleOpenChange = (open: boolean) => {
    if (forceClose) return;
    setIsOpen(open);
    localStorage.setItem("sidebarOpen", String(open));
  };

  const isMobile = useIsMobile();

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

  return (
    <div
      className={cn(
        "flex-shrink-0 overflow-hidden transition-all duration-100 ease-in-out",
        {
          "sm:w-[220px]": isOpen && !forceClose,
          "sm:w-[45px]": !isOpen || forceClose,
        },
      )}
    >
      <SidebarProvider
        onOpenChange={handleOpenChange}
        open={isOpen && !forceClose}
      >
        {isMobile && !forceClose && (
          <div className="fixed top-[18px] left-2 z-50 flex items-center gap-2">
            <SidebarTrigger className="hover:bg-accent" />
          </div>
        )}
        <Sidebar
          collapsible={forceClose ? "icon" : "icon"}
          className={cn("bg-background h-screen", className)}
        >
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <div
                  className={cn(
                    "flex w-full items-center justify-between gap-2",
                    isOpen ? "flex-row" : "flex-col",
                  )}
                >
                  <SidebarMenuButton size="lg" className="mx-auto">
                    <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                      <Image
                        src="/logo-with-bg.png"
                        alt="Logo"
                        width={32}
                        height={32}
                        className="rounded-md"
                      />
                    </div>
                    {!forceClose && isOpen && (
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {organizationName}
                        </span>
                        <span className="truncate text-xs">{user.role}</span>
                      </div>
                    )}
                  </SidebarMenuButton>
                  {!forceClose && <SidebarTrigger />}
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu>
                {sidebarItems.map((item) => {
                  const ItemIcon = item.icon;
                  const isSubItemActive =
                    item.items?.some(
                      (subItem) => subItem.url && pathname === subItem.url,
                    ) ?? false;
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
                            {isOpen ? (
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
                                    <div className="bg-popover text-popover-foreground flex w-[160px] flex-col overflow-hidden rounded-md border shadow-md">
                                      {item.items?.map((subItem) => (
                                        <a
                                          key={subItem.title}
                                          href={subItem.url}
                                          className={cn(
                                            "relative flex items-center px-2.5 py-1.5 text-sm outline-none select-none",
                                            "hover:bg-accent hover:text-accent-foreground transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                            pathname === subItem.url &&
                                              "bg-accent text-accent-foreground",
                                          )}
                                        >
                                          <span className="truncate">
                                            {subItem.title}
                                          </span>
                                        </a>
                                      ))}
                                    </div>
                                  ),
                                  className: "p-0",
                                  side: "right",
                                  sideOffset: 4,
                                  align: "center",
                                }}
                                className={cn(
                                  pathname === item.url
                                    ? "bg-primary text-primary-foreground"
                                    : "",
                                  isSubItemActive &&
                                    !isOpen &&
                                    "bg-accent text-accent-foreground",
                                  "hover:bg-primary/90 hover:text-primary-foreground m-auto flex cursor-pointer items-center gap-4 rounded px-5 py-5 text-base",
                                )}
                              >
                                <ItemIcon className="size-6" />
                              </SidebarMenuButton>
                            )}
                            {isOpen && (
                              <CollapsibleContent>
                                <SidebarMenuSub>
                                  {item.items?.map((subItem) => (
                                    <SidebarMenuSubItem key={subItem.title}>
                                      <SidebarMenuSubButton
                                        asChild
                                        className={cn(
                                          pathname === subItem.url
                                            ? "bg-primary text-primary-foreground"
                                            : "",
                                          "hover:bg-primary/90 hover:text-primary-foreground m-auto flex cursor-pointer items-center gap-4 rounded px-5 py-5 text-base",
                                          subItem.className ?? "",
                                        )}
                                      >
                                        <a href={subItem.url}>
                                          <span>{subItem.title}</span>
                                        </a>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            )}
                          </>
                        ) : (
                          <a href={item.url}>
                            <SidebarMenuButton
                              tooltip={isOpen ? "" : item.title}
                              className={cn(
                                pathname === item.url
                                  ? "bg-primary text-primary-foreground"
                                  : "",
                                "hover:bg-primary/90 hover:text-primary-foreground m-auto flex cursor-pointer items-center gap-4 rounded px-5 py-5 text-base",
                              )}
                            >
                              <ItemIcon className="size-6" />
                              {isOpen && <span>{item.title}</span>}
                            </SidebarMenuButton>
                          </a>
                        )}
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {isMobile && !forceClose && mobileTabs.length > 0 && (
          <nav className="bg-background/80 supports-[backdrop-filter]:bg-background/60 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur">
            <ul className="flex items-stretch justify-between px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              {mobileTabs.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <li key={tab.title} className="flex-1">
                    <a
                      href={tab.url}
                      aria-current={tab.active ? "page" : undefined}
                      className={cn(
                        "group flex flex-col items-center justify-center gap-0.5 py-2 text-xs",
                        tab.active
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <div
                        className={cn(
                          "grid size-9 place-items-center rounded-full",
                          tab.active ? "bg-primary/10" : "",
                        )}
                      >
                        <TabIcon className={cn("size-5")} />
                      </div>
                      <span className="leading-none">{tab.title}</span>
                    </a>
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
