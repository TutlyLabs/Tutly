"use client";

import {
  SandpackCodeEditor,
  SandpackPreview,
} from "@codesandbox/sandpack-react";
import type { Attachment } from "@tutly/db/browser";
// @ts-expect-error - sandpack-file-explorer package has incorrect type definitions
import { SandpackFileExplorer } from "sandpack-file-explorer";
import { Maximize2, Monitor } from "lucide-react";
import { useState } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@tutly/ui/resizable";

import { AssignmentPreview } from "./AssignmentPreview";
import { BottomTabs } from "./BottomTabs";
import "./styles.css";

interface SandboxEmbedProps {
  assignment?: Attachment | null;
  isEditTemplate: boolean;
  config: {
    fileExplorer: boolean;
    closableTabs: boolean;
  };
}
export function SandboxEmbed({
  assignment,
  isEditTemplate,
  config,
}: SandboxEmbedProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  return (
    <div className="bg-background relative h-full min-h-[calc(100vh-3rem)] w-full">
      {isFullScreen && (
        <div className="bg-background fixed inset-0 z-50 flex flex-col">
          <div className="bg-card flex h-10 shrink-0 items-center justify-between border-b px-4">
            <div className="text-foreground inline-flex items-center gap-2 text-sm font-medium">
              <Monitor className="h-4 w-4 text-indigo-500" />
              Preview
            </div>
            <button
              onClick={() => setIsFullScreen(false)}
              className="hover:bg-accent text-muted-foreground rounded-md px-2 py-1 text-xs"
            >
              Exit fullscreen
            </button>
          </div>
          <div className="flex-1">
            <SandpackPreview
              showOpenInCodeSandbox={false}
              showRefreshButton
              showSandpackErrorOverlay={false}
              style={{ height: "100%", width: "100%" }}
            />
          </div>
        </div>
      )}

      <ResizablePanelGroup
        direction="horizontal"
        className="bg-card relative h-full min-h-[calc(100vh-3rem)] w-full overflow-hidden rounded-xl border shadow-sm"
      >
        {assignment && (
          <>
            <ResizablePanel defaultSize={isEditTemplate ? 20 : 30} minSize={1}>
              <AssignmentPreview assignment={assignment} />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        <ResizablePanel defaultSize={assignment ? 70 : 100}>
          <ResizablePanelGroup direction="horizontal" className="h-full w-full">
            {config.fileExplorer && (
              <>
                <ResizablePanel defaultSize={16} minSize={1}>
                  <div className="bg-card flex h-full w-full flex-col border-r">
                    <div className="bg-card text-foreground flex h-9 shrink-0 items-center border-b px-3 text-sm font-medium">
                      Files
                    </div>
                    <div
                      className="file-explorer flex-1 overflow-y-auto"
                      style={
                        {
                          "--sp-layout-height": "95vh",
                          maxHeight: "100vh",
                        } as React.CSSProperties
                      }
                    >
                      <SandpackFileExplorer />
                    </div>
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}

            <ResizablePanel defaultSize={config.fileExplorer ? 84 : 100}>
              <ResizablePanelGroup direction="horizontal" className="h-full">
                <ResizablePanel defaultSize={55} minSize={1}>
                  <div className="bg-card flex h-full flex-col">
                    <SandpackCodeEditor
                      showTabs
                      showLineNumbers
                      showInlineErrors
                      wrapContent
                      closableTabs={config.closableTabs}
                      style={{
                        height: "100%",
                        maxHeight: "calc(100vh - 2rem)",
                        flex: 1,
                      }}
                    />
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={45} minSize={10}>
                  <ResizablePanelGroup direction="vertical" className="h-full">
                    <ResizablePanel defaultSize={70} minSize={10}>
                      <div className="bg-card flex h-full flex-col border-l">
                        <div className="bg-card text-foreground flex h-9 shrink-0 items-center justify-between border-b px-3">
                          <div className="inline-flex items-center gap-2 text-sm font-medium">
                            <Monitor className="h-4 w-4 text-indigo-500" />
                            Preview
                          </div>
                          <button
                            onClick={() => setIsFullScreen(true)}
                            className="hover:bg-accent text-muted-foreground rounded-md p-1.5 transition-colors"
                            aria-label="Fullscreen preview"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="bg-background flex-1">
                          <SandpackPreview
                            showOpenInCodeSandbox={false}
                            showRefreshButton
                            showSandpackErrorOverlay={false}
                            showOpenNewtab
                            style={{ height: "100%", width: "100%" }}
                          />
                        </div>
                      </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    <ResizablePanel defaultSize={30} minSize={10}>
                      <div className="bg-card flex h-full flex-col border-t border-l">
                        <BottomTabs />
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
