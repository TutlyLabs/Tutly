"use client";

import {
  type SandpackPredefinedTemplate,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@tutly/ui/resizable";

import ActivityBar from "./ActivityBar";
import BottomPanel from "./BottomPanel";
import CommandPalette from "./CommandPalette";
import EditorRoot from "./EditorRoot";
import FileTree from "./FileTree";
import { downloadProjectZip } from "./fileOps";
import {
  ClosableTabsContext,
  EditableScopeContext,
  type EditableScope,
} from "./ideOptions";
import { useIDE } from "./ideStore";
import PreviewPane from "./PreviewPane";
import SearchPanel from "./SearchPanel";
import SettingsPanel from "./SettingsPanel";
import StatusBar from "./StatusBar";
import { useLocalSync } from "./useLocalSync";
import { AssignmentPreview } from "../../sandbox/_components/AssignmentPreview";

type LogEntry = { type: string; args: unknown[]; id: string };

export default function IDEShell({
  template,
  topBar,
  closableTabs = true,
  editableScope,
  projectName,
  assignment,
  restrictFiles = false,
}: {
  template?: SandpackPredefinedTemplate;
  topBar?: React.ReactNode;
  closableTabs?: boolean;
  editableScope?: EditableScope;
  projectName?: string;
  assignment?: any | null;
  restrictFiles?: boolean;
}) {
  const {
    state,
    closeTab,
    toggleSidebar,
    toggleBottom,
    splitWithTab,
    setSidebarActive,
  } = useIDE();
  const { sandpack } = useSandpack();
  const [staticLogs, setStaticLogs] = useState<LogEntry[]>([]);
  const localSync = useLocalSync();

  const scope = useMemo<EditableScope>(
    () => ({
      allowList: editableScope?.allowList ?? null,
      templatePaths: editableScope?.templatePaths ?? null,
      projectName: editableScope?.projectName ?? projectName,
    }),
    [
      editableScope?.allowList,
      editableScope?.templatePaths,
      editableScope?.projectName,
      projectName,
    ],
  );

  const isStatic = template === "static";
  const bottomPos = state.bottomPanel.position;
  const bottomCollapsed = state.bottomPanel.collapsed;

  const handleStaticLog = useCallback(
    (entry: { type: string; args: unknown[] }) => {
      setStaticLogs((p) => [
        ...p,
        { ...entry, id: `${Date.now()}-${Math.random()}` },
      ]);
    },
    [],
  );

  const handleClearStaticLogs = useCallback(() => {
    setStaticLogs([]);
  }, []);

  useEffect(() => {
    const findActivePane = (n: any): any => {
      if (n.type === "pane" && n.id === state.activePaneId) return n;
      if (n.type === "split") {
        for (const c of n.children) {
          const r = findActivePane(c);
          if (r) return r;
        }
      }
      return null;
    };

    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "w") {
        e.preventDefault();
        if (!closableTabs) return;
        const active = findActivePane(state.layout);
        if (active?.activeTabId) closeTab(active.id, active.activeTabId);
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void downloadProjectZip(
          sandpack.files,
          scope.projectName ?? "tutly-project",
        );
      }
    };
    const onToggleSidebar = () => toggleSidebar();
    const onTogglePanel = () => toggleBottom();
    const onSplitRight = () => {
      const active = findActivePane(state.layout);
      if (active?.activeTabId)
        splitWithTab(active.id, active.activeTabId, active.id, "right");
    };
    const onOpenSettings = () => {
      setSidebarActive("settings");
      if (!state.sidebar.visible) toggleSidebar();
    };
    const onStartLocalSync = () => void localSync.start();
    const onStopLocalSync = () => localSync.stop();
    window.addEventListener("keydown", onKey);
    window.addEventListener("tutly:toggle-sidebar", onToggleSidebar);
    window.addEventListener("tutly:toggle-panel", onTogglePanel);
    window.addEventListener("tutly:split-right", onSplitRight);
    window.addEventListener("tutly:open-settings", onOpenSettings);
    window.addEventListener("tutly:start-local-sync", onStartLocalSync);
    window.addEventListener("tutly:stop-local-sync", onStopLocalSync);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("tutly:toggle-sidebar", onToggleSidebar);
      window.removeEventListener("tutly:toggle-panel", onTogglePanel);
      window.removeEventListener("tutly:split-right", onSplitRight);
      window.removeEventListener("tutly:open-settings", onOpenSettings);
      window.removeEventListener("tutly:start-local-sync", onStartLocalSync);
      window.removeEventListener("tutly:stop-local-sync", onStopLocalSync);
    };
  }, [
    state,
    closeTab,
    toggleSidebar,
    toggleBottom,
    splitWithTab,
    setSidebarActive,
    closableTabs,
    sandpack.files,
    scope.projectName,
    localSync,
  ]);

  return (
    <ClosableTabsContext.Provider value={closableTabs}>
      <EditableScopeContext.Provider value={scope}>
        <div className="bg-background text-foreground flex h-full min-h-0 w-full flex-col overflow-hidden">
          {topBar}
          <div className="flex min-h-0 flex-1">
            <ActivityBar
              hasAssignment={Boolean(assignment)}
              restrictFiles={restrictFiles}
            />
            <div className="flex min-h-0 min-w-0 flex-1">
              <ResizablePanelGroup
                direction="horizontal"
                className="h-full min-h-0"
                id="ide-root"
                autoSaveId={undefined}
              >
                {state.sidebar.visible && [
                  <ResizablePanel
                    key="sidebar"
                    id="ide-sidebar"
                    order={1}
                    defaultSize={
                      state.sidebar.active === "assignment" ? 26 : 18
                    }
                    minSize={10}
                    maxSize={40}
                  >
                    <SidebarBody assignment={assignment ?? null} />
                  </ResizablePanel>,
                  <ResizableHandle key="sidebar-handle" />,
                ]}
                <ResizablePanel
                  key="editor"
                  id="ide-editor"
                  order={2}
                  defaultSize={state.preview.visible ? 38 : 82}
                  minSize={20}
                >
                  {state.bottomPanel.visible && bottomPos === "editor" ? (
                    <ResizablePanelGroup
                      direction="vertical"
                      className="h-full"
                      id="ide-editor-stack"
                      autoSaveId={undefined}
                    >
                      <ResizablePanel
                        id="ide-editor-area"
                        order={1}
                        minSize={20}
                      >
                        <div className="h-full min-h-0">
                          <EditorRoot />
                        </div>
                      </ResizablePanel>
                      <ResizableHandle />
                      <ResizablePanel
                        key={`bottom-editor-${bottomCollapsed ? "c" : "e"}`}
                        id="ide-bottom-editor"
                        order={2}
                        defaultSize={bottomCollapsed ? 5 : 28}
                        minSize={bottomCollapsed ? 5 : 10}
                        maxSize={bottomCollapsed ? 5 : 70}
                      >
                        <BottomPanel
                          isStatic={isStatic}
                          staticLogs={staticLogs}
                          onClearStaticLogs={handleClearStaticLogs}
                        />
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  ) : (
                    <div className="h-full min-h-0">
                      <EditorRoot />
                    </div>
                  )}
                </ResizablePanel>
                {state.preview.visible && [
                  <ResizableHandle key="preview-handle" />,
                  <ResizablePanel
                    key="preview"
                    id="ide-preview"
                    order={3}
                    defaultSize={44}
                    minSize={20}
                    maxSize={70}
                  >
                    {state.bottomPanel.visible && bottomPos === "preview" ? (
                      <ResizablePanelGroup
                        direction="vertical"
                        className="h-full"
                        id="ide-preview-stack"
                        autoSaveId={undefined}
                      >
                        <ResizablePanel
                          id="ide-preview-area"
                          order={1}
                          minSize={20}
                        >
                          <PreviewPane
                            template={template}
                            onStaticLog={handleStaticLog}
                            onClearStaticLogs={handleClearStaticLogs}
                          />
                        </ResizablePanel>
                        <ResizableHandle />
                        <ResizablePanel
                          key={`bottom-preview-${bottomCollapsed ? "c" : "e"}`}
                          id="ide-bottom-preview"
                          order={2}
                          defaultSize={bottomCollapsed ? 5 : 35}
                          minSize={bottomCollapsed ? 5 : 10}
                          maxSize={bottomCollapsed ? 5 : 70}
                        >
                          <BottomPanel
                            isStatic={isStatic}
                            staticLogs={staticLogs}
                            onClearStaticLogs={handleClearStaticLogs}
                          />
                        </ResizablePanel>
                      </ResizablePanelGroup>
                    ) : (
                      <PreviewPane
                        template={template}
                        onStaticLog={handleStaticLog}
                        onClearStaticLogs={handleClearStaticLogs}
                      />
                    )}
                  </ResizablePanel>,
                ]}
              </ResizablePanelGroup>
            </div>
          </div>
          <StatusBar
            localSyncFolder={
              localSync.status.kind === "active"
                ? localSync.status.folderName
                : null
            }
          />
          <CommandPalette />
        </div>
      </EditableScopeContext.Provider>
    </ClosableTabsContext.Provider>
  );
}

function SidebarBody({ assignment }: { assignment: any | null }) {
  const { state } = useIDE();
  return (
    <div className="bg-muted/10 flex h-full min-h-0 flex-col border-r">
      {state.sidebar.active === "assignment" && assignment && (
        <AssignmentPreview assignment={assignment} />
      )}
      {state.sidebar.active === "files" && <FileTree />}
      {state.sidebar.active === "search" && <SearchPanel />}
      {state.sidebar.active === "settings" && <SettingsPanel />}
    </div>
  );
}
