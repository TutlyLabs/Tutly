"use client";

import {
  type SandpackFiles,
  type SandpackPredefinedTemplate,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import { useCallback, useState } from "react";
import { Maximize2, Minimize2, Monitor } from "lucide-react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@tutly/ui/resizable";
import { useBundlerUrl } from "@/hooks/use-bundler-url";

import MonacoEditor from "./MonacoEditor";
import SandboxConsole from "./SandboxConsole";
import StaticConsole from "./StaticConsole";
import StaticPreview from "./StaticPreview";
import SubmitAssignment from "./SubmitAssignment";
import type { SessionUser } from "@/lib/auth";

const defaultFiles: SandpackFiles = {
  "/index.html": `<!DOCTYPE html>
<html>

<head>
  <title>Document</title>
  <link rel="stylesheet" href="/styles.css">
</head>

<body>
  <h1>Hello world!</h1>
  <script src="/index.js"></script>
</body>

</html>
`,
  "/styles.css": "",
  "/index.js": "",
};

const Playground = ({
  assignmentId,
  initialFiles,
  template = "static",
  currentUser,
}: {
  assignmentId?: string;
  initialFiles?: SandpackFiles;
  template?: SandpackPredefinedTemplate;
  currentUser: SessionUser;
}) => {
  const bundlerUrl = useBundlerUrl();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [staticLogs, setStaticLogs] = useState<string[]>([]);

  const handleStaticLog = useCallback((log: string) => {
    setStaticLogs((prev) => [...prev, log]);
  }, []);

  const handleClearStaticLogs = useCallback(() => {
    setStaticLogs([]);
  }, []);

  const startingFiles = initialFiles || defaultFiles;

  return (
    <div className="bg-background relative h-[calc(100vh-3.5rem)]">
      <SandpackProvider
        files={startingFiles}
        template={template}
        theme="light"
        options={{
          bundlerURL: bundlerUrl,
        }}
      >
        {isFullScreen && (
          <div className="bg-background fixed inset-0 z-50 flex flex-col">
            <div className="bg-card flex h-10 shrink-0 items-center justify-between border-b px-4">
              <div className="text-foreground inline-flex items-center gap-2 text-sm font-medium">
                <Monitor className="h-4 w-4 text-indigo-500" />
                Preview
              </div>
              <button
                className="hover:bg-accent text-muted-foreground inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
                onClick={() => setIsFullScreen(false)}
              >
                <Minimize2 className="h-3.5 w-3.5" />
                Exit fullscreen
              </button>
            </div>
            <div className="flex-1">
              {template === "static" ? (
                <StaticPreview
                  onConsoleLog={handleStaticLog}
                  onClear={handleClearStaticLogs}
                />
              ) : (
                <SandpackPreview
                  showNavigator
                  showOpenInCodeSandbox={false}
                  className="h-full"
                />
              )}
            </div>
          </div>
        )}

        <ResizablePanelGroup
          direction="horizontal"
          className="bg-card h-full overflow-hidden rounded-xl border shadow-sm"
        >
          <ResizablePanel defaultSize={55} minSize={30}>
            <MonacoEditor />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={45} minSize={25}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={70} minSize={30}>
                <div className="flex h-full flex-col">
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
                  <div className="bg-background flex-1 overflow-hidden">
                    {template === "static" ? (
                      <StaticPreview
                        onConsoleLog={handleStaticLog}
                        onClear={handleClearStaticLogs}
                      />
                    ) : (
                      <SandpackPreview
                        showOpenNewtab
                        showOpenInCodeSandbox={false}
                        className="h-full"
                      />
                    )}
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={10}>
                {template === "static" ? (
                  <StaticConsole
                    logs={staticLogs}
                    onClear={handleClearStaticLogs}
                  />
                ) : (
                  <SandboxConsole />
                )}
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
        {assignmentId && (
          <div className="absolute -top-3 left-1/2 z-[60] -translate-x-1/2 -translate-y-1/2">
            <SubmitAssignment
              currentUser={currentUser}
              assignmentId={assignmentId}
            />
          </div>
        )}
      </SandpackProvider>
    </div>
  );
};

export default Playground;
