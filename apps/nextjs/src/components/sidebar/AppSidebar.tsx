"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import type { Role, User } from "@tutly/db/types";
import { cn } from "@tutly/ui";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@tutly/ui/collapsible";
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
  SidebarProvider,
  SidebarTrigger,
} from "@tutly/ui/sidebar";

import { useIsMobile } from "~/hooks/use-mobile";
import { getDefaultSidebarItems } from "./config";

export interface SidebarItem {
  title: string;
  url: string;
  icon: React.ElementType;
  items?: SidebarItem[];
  isActive?: boolean;
  className?: string;
}

interface AppSidebarProps {
  user: User;
  forceClose?: boolean;
  className?: string;
}

export function AppSidebar({
  user,
  forceClose = false,
  className,
}: AppSidebarProps) {
  const organizationName = "Tutly";
  const pathname = usePathname();

  const sidebarItems = getDefaultSidebarItems(user.role as Role);
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("sidebarOpen");
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    if (forceClose) {
      setIsOpen(false);
    }
  }, [forceClose]);

  const handleOpenChange = (open: boolean) => {
    if (!forceClose) {
      setIsOpen(open);
      localStorage.setItem("sidebarOpen", String(open));
    }
  };

  const isMobile = useIsMobile();

  return (
    <SidebarProvider onOpenChange={handleOpenChange} open={isOpen}>
      {isMobile && (
        <div className="fixed left-2 top-4 flex items-center gap-2">
          <SidebarTrigger className="hover:bg-accent" />
        </div>
      )}
      <Sidebar collapsible="icon" className={cn("bg-background", className)}>
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
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Image
                      width={32}
                      height={32}
                      src="/logo-with-bg.png"
                      alt="Logo"
                      className="size-8 rounded-md"
                    />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {organizationName}
                    </span>
                    <span className="truncate text-xs">{user.role}</span>
                  </div>
                </SidebarMenuButton>
                {!forceClose && <SidebarTrigger className="h-5 w-4" />}
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
                  item.items?.some((subItem) => pathname === subItem.url) ||
                  false;
                return (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={
                      item.isActive ||
                      pathname.startsWith(item.url) ||
                      isSubItemActive
                    }
                    className={`group/collapsible ${item.className || ""}`}
                  >
                    <SidebarMenuItem>
                      {item.items ? (
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.title}
                            className={`${pathname === item.url ? "bg-primary text-primary-foreground" : ""} m-auto flex cursor-pointer items-center gap-4 rounded px-5 py-5 text-base hover:bg-primary/90 hover:text-primary-foreground`}
                          >
                            <ItemIcon className="size-6" />
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                      ) : (
                        <a href={item.url}>
                          <SidebarMenuButton
                            tooltip={item.title}
                            className={`${pathname === item.url ? "bg-primary text-primary-foreground" : ""} m-auto flex cursor-pointer items-center gap-4 rounded px-5 py-5 text-base hover:bg-primary/90 hover:text-primary-foreground`}
                          >
                            <ItemIcon className="size-6" />
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                        </a>
                      )}
                      {item.items && (
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((subItem: SidebarItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  className={`${pathname === subItem.url ? "bg-primary text-primary-foreground" : ""} m-auto flex cursor-pointer items-center gap-4 rounded px-5 py-5 text-base hover:bg-primary/90 hover:text-primary-foreground ${subItem.className || ""}`}
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
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}
