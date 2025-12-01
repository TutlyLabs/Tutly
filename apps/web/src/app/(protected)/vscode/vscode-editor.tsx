"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Send, Save } from "lucide-react";
import { LocalPlaygroundSetupScreen } from "./local-playground-screen";
import { PageLayout } from "@/components/PageLayout";

interface VSCodeEditorProps {
  iframeSrc: string;
  assignmentId?: string;
  assignmentName?: string;
  courseName?: string;
  userName: string;
}

export default function VSCodeEditor({
  iframeSrc,
  assignmentId,
  assignmentName,
  courseName,
  userName,
}: VSCodeEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isVSCodeReady, setIsVSCodeReady] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showSetup, setShowSetup] = useState(true);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "VSCODE_READY") {
        console.log("[VSCode Editor] Received VSCODE_READY event");
        setIsVSCodeReady(true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleSetupComplete = () => {
    setShowSetup(false);
    setHasStarted(true);
  };

  const triggerCommand = (command: "run" | "submit" | "save") => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({ type: "TRIGGER_COMMAND", command }, "*");
  };

  return (
    <PageLayout hideHeader hideCrisp hideSidebar forceClose className="p-0">
      <div
        style={{
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Local Playground Setup Screen */}
        {showSetup && (
          <LocalPlaygroundSetupScreen
            assignmentId={assignmentId}
            assignmentName={assignmentName}
            courseName={courseName}
            userName={userName}
            onComplete={handleSetupComplete}
          />
        )}

        {/* Compact Header */}
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#2b2b2b] bg-[#1e1e1e] px-4 text-[#cccccc] select-none">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-white">VS Code</span>
              <span className="text-[#5a5a5a]">/</span>
              <span>Editor</span>
            </div>
            <div className="h-4 w-[1px] bg-[#333]" />
            <div className="flex items-center gap-1.5 text-xs">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
              <span className="opacity-60">Online</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => triggerCommand("save")}
              className="h-7 gap-1.5 px-3 text-xs text-[#cccccc] hover:bg-[#2b2b2b] hover:text-white"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => triggerCommand("run")}
              className="h-7 gap-1.5 px-3 text-xs text-[#cccccc] hover:bg-[#2b2b2b] hover:text-white"
            >
              <Play className="h-3.5 w-3.5" />
              Run
            </Button>
            <Button
              size="sm"
              onClick={() => triggerCommand("submit")}
              className="h-7 gap-1.5 border-none bg-[#007acc] px-3 text-xs text-white hover:bg-[#0063a5]"
            >
              <Send className="h-3.5 w-3.5" />
              Submit
            </Button>
          </div>
        </div>

        <div className="relative flex-1">
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              opacity: hasStarted ? 1 : 0,
              transition: "opacity 0.3s ease-in-out",
            }}
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </PageLayout>
  );
}
