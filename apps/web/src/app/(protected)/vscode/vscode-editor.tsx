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
  userId: string;
  hasRunCommand?: boolean;
}

export default function VSCodeEditor({
  iframeSrc,
  assignmentId,
  assignmentName,
  courseName,
  userName,
  userId,
  hasRunCommand = false,
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
            userId={userId}
            onComplete={handleSetupComplete}
          />
        )}

        {/* Compact Header */}
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#2b2b2b] bg-[#1e1e1e] px-4 text-[#cccccc] select-none">
          {/* Left Section */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-white">VS Code</span>
              <span className="text-[#5a5a5a]">/</span>
              <span>Editor</span>
            </div>
            <div className="h-3 w-[1px] bg-[#333]" />
            <div className="flex items-center gap-1.5 text-[10px]">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
              <span className="opacity-60">Online</span>
            </div>
          </div>

          {/* Center Section - Run Button */}
          {hasRunCommand && (
            <div className="absolute left-1/2 -translate-x-1/2">
              <Button
                onClick={() => triggerCommand("run")}
                className="h-7 cursor-pointer gap-1.5 border-none bg-emerald-600 px-3 text-xs text-white transition-colors hover:bg-emerald-700"
              >
                <Play className="h-3 w-3 fill-current" />
                Run Code
              </Button>
            </div>
          )}

          {/* Right Section - Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => triggerCommand("save")}
              className="h-7 gap-1.5 px-3 text-xs text-[#cccccc] transition-colors hover:bg-[#2b2b2b] hover:text-white"
            >
              <Save className="h-3 w-3" />
              Save
            </Button>
            <Button
              size="sm"
              onClick={() => triggerCommand("submit")}
              className="h-7 gap-1.5 border-none bg-[#007acc] px-3 text-xs text-white transition-colors hover:bg-[#0063a5]"
            >
              <Send className="h-3 w-3" />
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
