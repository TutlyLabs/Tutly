"use client";

import {
  SandpackCodeEditor,
  SandpackPreview,
} from "@codesandbox/sandpack-react";
import type { Attachment } from "@/lib/prisma";
// @ts-expect-error - sandpack-file-explorer package has incorrect type definitions
import { SandpackFileExplorer } from "sandpack-file-explorer";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

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
  return (
    <div className="relative h-full w-full">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-black"></div>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(30, 30, 30, 0.3) 0%, transparent 70%)",
        }}
      ></div>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at bottom right, rgba(37, 208, 171, 0.02) 0%, transparent 60%)",
        }}
      ></div>

      <ResizablePanelGroup
        direction="horizontal"
        className="relative z-10 h-full min-h-[calc(100vh-3rem)] w-full"
      >
        {/* Assignment Panel - Only show if assignment exists */}
        {assignment && (
          <>
            <ResizablePanel defaultSize={isEditTemplate ? 20 : 35} minSize={1}>
              <AssignmentPreview assignment={assignment} />
            </ResizablePanel>

            <ResizableHandle
              style={{ backgroundColor: "rgba(100, 100, 100, 0.2)" }}
              className="transition-opacity hover:opacity-80"
            />
          </>
        )}

        {/* Sandbox Panel */}
        <ResizablePanel defaultSize={assignment ? 65 : 100}>
          <ResizablePanelGroup direction="horizontal" className="h-full w-full">
            {/* File Explorer  */}
            {config.fileExplorer && (
              <>
                <ResizablePanel defaultSize={18} minSize={1}>
                  <div
                    className="flex h-full w-full flex-col border-r shadow-2xl backdrop-blur-xl"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(35, 35, 35, 1) 0%, rgba(25, 25, 25, 1) 50%, rgba(20, 20, 20, 1) 100%)",
                      borderColor: "rgba(100, 100, 100, 0.2)",
                    }}
                  >
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

                <ResizableHandle
                  style={{ backgroundColor: "rgba(100, 100, 100, 0.2)" }}
                  className="transition-opacity hover:opacity-80"
                />
              </>
            )}

            {/* Editor and Preview */}
            <ResizablePanel defaultSize={config.fileExplorer ? 82 : 100}>
              <ResizablePanelGroup direction="horizontal" className="h-full">
                {/* Editor */}
                <ResizablePanel defaultSize={50} minSize={1}>
                  <div
                    className="flex h-full flex-col shadow-2xl backdrop-blur-xl"
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 1)",
                    }}
                  >
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

                <ResizableHandle
                  style={{ backgroundColor: "rgba(100, 100, 100, 0.2)" }}
                  className="transition-opacity hover:opacity-80"
                />

                {/* Preview and Bottom Tabs */}
                <ResizablePanel defaultSize={50} minSize={10}>
                  <ResizablePanelGroup direction="vertical" className="h-full">
                    {/* Preview */}
                    <ResizablePanel defaultSize={70} minSize={10}>
                      <div
                        className="flex h-full flex-col border-l shadow-2xl backdrop-blur-xl"
                        style={{
                          borderColor: "rgba(100, 100, 100, 0.2)",
                          backgroundColor: "rgba(0, 0, 0, 0.95)",
                        }}
                      >
                        <div
                          className="flex h-[42px] flex-shrink-0 items-center border-b px-4 backdrop-blur-xl"
                          style={{
                            borderColor: "rgba(100, 100, 100, 0.2)",
                            background:
                              "linear-gradient(90deg, rgba(20, 20, 20, 0.9) 0%, rgba(40, 40, 40, 0.8) 100%)",
                          }}
                        >
                          <div
                            className="flex items-center text-sm font-semibold"
                            style={{ color: "#ffffff" }}
                          >
                            <span
                              className="mr-2 h-2 w-2 animate-pulse rounded-full shadow-sm"
                              style={{
                                backgroundColor: "#f59e0b",
                                boxShadow: "0 0 4px rgba(245, 158, 11, 0.5)",
                              }}
                            ></span>
                            Preview
                          </div>
                        </div>
                        <div className="flex-1">
                          <SandpackPreview
                            showOpenInCodeSandbox={false}
                            showRefreshButton
                            showSandpackErrorOverlay={false}
                            showOpenNewtab
                            style={{
                              height: "100%",
                              width: "100%",
                            }}
                          />
                        </div>
                      </div>
                    </ResizablePanel>

                    <ResizableHandle
                      style={{ backgroundColor: "rgba(100, 100, 100, 0.2)" }}
                      className="transition-opacity hover:opacity-80"
                    />

                    {/* Bottom Tabs (Console and Tests) */}
                    <ResizablePanel defaultSize={30} minSize={10}>
                      <div
                        className="flex h-full flex-col rounded-br-xl border-l shadow-2xl backdrop-blur-xl"
                        style={{
                          borderColor: "rgba(100, 100, 100, 0.2)",
                          background:
                            "linear-gradient(180deg, rgba(35, 35, 35, 1) 0%, rgba(25, 25, 25, 1) 50%, rgba(20, 20, 20, 1) 100%)",
                        }}
                      >
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
