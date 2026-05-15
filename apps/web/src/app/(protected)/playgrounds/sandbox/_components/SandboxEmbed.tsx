"use client";

import {
  type SandpackPredefinedTemplate,
  useSandpack,
} from "@codesandbox/sandpack-react";
import type { Attachment } from "@tutly/db/browser";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@tutly/ui/resizable";

import IDEShell from "@/app/(protected)/playgrounds/_components/ide/IDEShell";
import type { EditableScope } from "@/app/(protected)/playgrounds/_components/ide/ideOptions";
import {
  IDEProvider,
  useIDE,
} from "@/app/(protected)/playgrounds/_components/ide/ideStore";

import { AssignmentPreview } from "./AssignmentPreview";

interface SandboxEmbedProps {
  assignment?: Attachment | null;
  isEditTemplate: boolean;
  template?: SandpackPredefinedTemplate | string;
  config: {
    fileExplorer: boolean;
    closableTabs: boolean;
  };
}

export function SandboxEmbed({
  assignment,
  isEditTemplate,
  template,
  config,
}: SandboxEmbedProps) {
  return (
    <IDEProvider>
      <SandboxEmbedInner
        assignment={assignment}
        isEditTemplate={isEditTemplate}
        template={template}
        config={config}
      />
    </IDEProvider>
  );
}

function SandboxEmbedInner({
  assignment,
  isEditTemplate,
  template,
  config,
}: SandboxEmbedProps) {
  const { sandpack } = useSandpack();

  // Capture template paths once on first non-empty sandpack.files.
  const initialPathsRef = useRef<string[] | null>(null);
  const [initialPaths, setInitialPaths] = useState<string[]>([]);
  if (initialPathsRef.current === null) {
    const keys = Object.keys(sandpack.files);
    if (keys.length > 0) {
      initialPathsRef.current = keys;
      // Defer the state update — React forbids setState during render.
      queueMicrotask(() => setInitialPaths(keys));
    }
  }

  const editableScope = useMemo<EditableScope>(() => {
    if (!assignment || isEditTemplate) {
      return { projectName: assignment?.title ?? undefined };
    }
    const meta = (assignment.detailsJson as any) ?? {};
    const allow: string[] | null = Array.isArray(meta.editableFiles)
      ? meta.editableFiles
      : null;
    return {
      allowList: allow,
      templatePaths: allow ? null : initialPaths,
      projectName: assignment.title || "assignment",
    };
  }, [assignment, isEditTemplate, initialPaths]);

  return (
    <>
      <AutoOpenInitial />
      {!config.fileExplorer && <HideSidebarOnMount />}

      <div className="bg-background relative h-full min-h-0 w-full overflow-hidden">
        <ResizablePanelGroup
          direction="horizontal"
          className="relative z-10 h-full min-h-0 w-full"
        >
          {assignment && (
            <>
              <ResizablePanel
                defaultSize={isEditTemplate ? 22 : 32}
                minSize={15}
                order={1}
              >
                <AssignmentPreview assignment={assignment} />
              </ResizablePanel>
              <ResizableHandle />
            </>
          )}
          <ResizablePanel defaultSize={assignment ? 68 : 100} order={2}>
            <IDEShell
              template={template as SandpackPredefinedTemplate | undefined}
              closableTabs={config.closableTabs}
              editableScope={editableScope}
              projectName={assignment?.title ?? undefined}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </>
  );
}

function AutoOpenInitial() {
  const { sandpack } = useSandpack();
  const { openFile, state } = useIDE();
  useEffect(() => {
    if (state.layout.type === "pane" && state.layout.tabs.length > 0) return;

    // Open configured visibleFiles/activeFile if provided.
    const visibleFromProps = sandpack.visibleFilesFromProps ?? [];
    const activeFromProps = sandpack.activeFile;

    if (visibleFromProps.length > 0) {
      for (const path of visibleFromProps) {
        if (sandpack.files[path] && !sandpack.files[path]?.hidden) {
          openFile(path);
        }
      }
      if (activeFromProps && sandpack.files[activeFromProps]) {
        openFile(activeFromProps);
      }
      return;
    }

    // Fallback: heuristic pick of a single entrypoint.
    const visible = Object.entries(sandpack.files).filter(([, f]) => !f.hidden);
    const preferred = visible.find(([p]) =>
      [
        "/App.tsx",
        "/src/App.tsx",
        "/App.js",
        "/App.jsx",
        "/index.tsx",
        "/index.js",
        "/index.html",
      ].includes(p),
    );
    const pick = activeFromProps ?? preferred?.[0] ?? visible[0]?.[0];
    if (pick) openFile(pick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function HideSidebarOnMount() {
  const { setSidebarVisible } = useIDE();
  useEffect(() => {
    setSidebarVisible(false);
  }, [setSidebarVisible]);
  return null;
}
