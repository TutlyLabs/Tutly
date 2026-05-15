"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@tutly/ui/command";
import {
  Download,
  FolderSync,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Sparkles,
  SplitSquareHorizontal,
  SplitSquareVertical,
  Sun,
  Moon,
  Upload,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useContext, useEffect, useState } from "react";

import { downloadProjectZip } from "./fileOps";
import { getDisplayName } from "./fileMeta";
import { FileIcon } from "./FileIcon";
import { EditableScopeContext } from "./ideOptions";
import { useIDE } from "./ideStore";
import { useFiles } from "./useFiles";

type Mode = "files" | "commands";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("files");
  const { files } = useFiles();
  const { setTheme, resolvedTheme } = useTheme();
  const {
    state,
    openFile,
    toggleSidebar,
    toggleBottom,
    togglePreview,
    splitWithTab,
  } = useIDE();
  const scope = useContext(EditableScopeContext);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setMode("commands");
        setOpen(true);
      } else if (meta && e.key.toLowerCase() === "p" && !e.shiftKey) {
        e.preventDefault();
        setMode("files");
        setOpen(true);
      } else if (meta && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      } else if (meta && e.key.toLowerCase() === "j") {
        e.preventDefault();
        toggleBottom();
      }
    };
    const onOpenEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as { mode?: Mode } | undefined;
      setMode(detail?.mode ?? "commands");
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("tutly:open-palette", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("tutly:open-palette", onOpenEvent);
    };
  }, [toggleSidebar, toggleBottom]);

  const filePaths = Object.keys(files).filter((p) => !files[p]?.hidden);

  const run = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  const activeTab = (() => {
    const findActive = (n: any): any => {
      if (n.type === "pane") {
        return n.tabs.find((t: any) => t.id === n.activeTabId);
      }
      for (const c of n.children) {
        const r = findActive(c);
        if (r) return r;
      }
      return null;
    };
    return findActive(state.layout);
  })();

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      className="max-w-2xl"
      shouldFilter
    >
      <CommandInput
        placeholder={
          mode === "files"
            ? "Search files by name..."
            : "Type a command to run..."
        }
        autoFocus
      />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        {mode === "commands" && (
          <>
            <CommandGroup heading="View">
              <CommandItem onSelect={run(toggleSidebar)}>
                <PanelLeft />
                Toggle sidebar
                <CommandShortcut>⌘B</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={run(toggleBottom)}>
                <PanelBottom />
                Toggle bottom panel
                <CommandShortcut>⌘J</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={run(togglePreview)}>
                <PanelRight />
                Toggle preview
              </CommandItem>
              {activeTab && (
                <>
                  <CommandItem
                    onSelect={run(() =>
                      splitWithTab(
                        state.activePaneId,
                        activeTab.id,
                        state.activePaneId,
                        "right",
                      ),
                    )}
                  >
                    <SplitSquareHorizontal />
                    Split editor right
                    <CommandShortcut>⌘\</CommandShortcut>
                  </CommandItem>
                  <CommandItem
                    onSelect={run(() =>
                      splitWithTab(
                        state.activePaneId,
                        activeTab.id,
                        state.activePaneId,
                        "bottom",
                      ),
                    )}
                  >
                    <SplitSquareVertical />
                    Split editor down
                  </CommandItem>
                </>
              )}
            </CommandGroup>
            <CommandGroup heading="Project">
              <CommandItem
                onSelect={run(() =>
                  downloadProjectZip(
                    files,
                    scope.projectName ?? "tutly-project",
                  ),
                )}
              >
                <Download />
                Download Project (.zip)
                <CommandShortcut>⌘⇧S</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={run(() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.multiple = true;
                  input.onchange = () => {
                    if (input.files)
                      window.dispatchEvent(
                        new CustomEvent("tutly:import-files", {
                          detail: input.files,
                        }),
                      );
                  };
                  input.click();
                })}
              >
                <Upload />
                Upload Files…
              </CommandItem>
              <CommandItem
                onSelect={run(() =>
                  window.dispatchEvent(
                    new CustomEvent("tutly:start-local-sync"),
                  ),
                )}
              >
                <FolderSync />
                Sync with Local Folder…{" "}
                <span className="text-muted-foreground ml-1 text-[10px] uppercase">
                  beta · chromium only
                </span>
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Theme">
              <CommandItem onSelect={run(() => setTheme("light"))}>
                <Sun />
                Light theme
              </CommandItem>
              <CommandItem onSelect={run(() => setTheme("dark"))}>
                <Moon />
                Dark theme
              </CommandItem>
              <CommandItem onSelect={run(() => setTheme("system"))}>
                <Sparkles />
                System theme
                <CommandShortcut className="ml-auto">
                  {resolvedTheme ?? "auto"}
                </CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </>
        )}
        <CommandGroup heading={mode === "files" ? "Files" : "Open File"}>
          {filePaths.map((path) => (
            <CommandItem
              key={path}
              value={path}
              onSelect={run(() => openFile(path))}
            >
              <FileIcon path={path} className="h-4 w-4 shrink-0" />
              <span className="truncate">{getDisplayName(path)}</span>
              <span className="text-muted-foreground ml-auto truncate text-[10px]">
                {path}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
