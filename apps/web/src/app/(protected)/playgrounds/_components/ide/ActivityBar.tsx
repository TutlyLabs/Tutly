"use client";

import {
  ClipboardList,
  Files,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Search,
  Settings,
} from "lucide-react";
import type { ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@tutly/ui/tooltip";
import { cn } from "@tutly/utils";

import { useIDE } from "./ideStore";

export default function ActivityBar({
  hasAssignment = false,
  restrictFiles = false,
}: {
  hasAssignment?: boolean;
  restrictFiles?: boolean;
}) {
  const {
    state,
    setSidebarActive,
    toggleSidebar,
    toggleBottom,
    togglePreview,
  } = useIDE();

  return (
    <div className="bg-muted/30 flex h-full w-11 flex-col items-center justify-between border-r py-2">
      <div className="flex flex-col items-center gap-1">
        {hasAssignment && (
          <ActivityItem
            tooltip="Assignment"
            active={
              state.sidebar.visible && state.sidebar.active === "assignment"
            }
            onClick={() => setSidebarActive("assignment")}
            variant="primary"
          >
            <ClipboardList className="h-5 w-5" />
          </ActivityItem>
        )}
        {!restrictFiles && (
          <ActivityItem
            tooltip="Explorer"
            shortcut="⌘B"
            active={state.sidebar.visible && state.sidebar.active === "files"}
            onClick={() => setSidebarActive("files")}
            variant="primary"
          >
            <Files className="h-5 w-5" />
          </ActivityItem>
        )}
        {!restrictFiles && (
          <ActivityItem
            tooltip="Search"
            shortcut="⌘⇧F"
            active={state.sidebar.visible && state.sidebar.active === "search"}
            onClick={() => setSidebarActive("search")}
            variant="primary"
          >
            <Search className="h-5 w-5" />
          </ActivityItem>
        )}
      </div>
      <div className="flex flex-col items-center gap-1">
        <ActivityItem
          tooltip="Toggle Sidebar"
          shortcut="⌘B"
          onClick={toggleSidebar}
          active={state.sidebar.visible}
        >
          <PanelLeft className="h-4 w-4" />
        </ActivityItem>
        <ActivityItem
          tooltip="Toggle Bottom Panel"
          shortcut="⌘J"
          onClick={toggleBottom}
          active={state.bottomPanel.visible && !state.bottomPanel.collapsed}
        >
          <PanelBottom className="h-4 w-4" />
        </ActivityItem>
        <ActivityItem
          tooltip="Toggle Preview"
          onClick={togglePreview}
          active={state.preview.visible}
        >
          <PanelRight className="h-4 w-4" />
        </ActivityItem>
        <ActivityItem
          tooltip="Settings"
          onClick={() => setSidebarActive("settings")}
          active={state.sidebar.visible && state.sidebar.active === "settings"}
        >
          <Settings className="h-4 w-4" />
        </ActivityItem>
      </div>
    </div>
  );
}

function ActivityItem({
  children,
  tooltip,
  shortcut,
  active,
  onClick,
  variant = "subtle",
}: {
  children: ReactNode;
  tooltip: string;
  shortcut?: string;
  active?: boolean;
  onClick: () => void;
  variant?: "primary" | "subtle";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={tooltip}
          onClick={onClick}
          className={cn(
            "focus-visible:ring-ring/40 relative grid h-9 w-9 cursor-pointer place-items-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none",
            active
              ? variant === "primary"
                ? "text-foreground"
                : "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          )}
        >
          {active && variant === "primary" && (
            <span className="bg-primary absolute top-1.5 bottom-1.5 left-0 w-[2px] rounded-r" />
          )}
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        <span>{tooltip}</span>
        {shortcut && (
          <kbd className="border-primary-foreground/30 bg-primary-foreground/10 rounded border px-1 text-[10px] font-medium tracking-wider">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
