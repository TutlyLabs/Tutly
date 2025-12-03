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
  hasRunCommand?: boolean;
}

export default function VSCodeEditor({
  iframeSrc,
  assignmentId,
  assignmentName,
  courseName,
  userName,
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
            onComplete={handleSetupComplete}
          />
        )}

        {/* Compact Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#2b2b2b] bg-[#1e1e1e] px-6 text-[#cccccc] select-none">
          {/* Left Section */}
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

          {/* Center Section - Premium Run Button */}
          {hasRunCommand && (
            <div className="absolute left-1/2 -translate-x-1/2">
              <Button
                onClick={() => triggerCommand("run")}
                className="group relative h-10 rounded-lg border-0 bg-gradient-to-r from-emerald-500 to-green-600 px-8 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:from-emerald-600 hover:to-green-700 hover:shadow-emerald-500/40"
              >
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-emerald-400/0 via-white/20 to-emerald-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <Play className="mr-2 h-4.5 w-4.5 fill-current" />
                <span className="relative">Run Code</span>
              </Button>
            </div>
          )}

          {/* Right Section - Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => triggerCommand("save")}
              className="h-8 gap-1.5 px-3 text-xs text-[#cccccc] transition-colors hover:bg-[#2b2b2b] hover:text-white"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
            <Button
              size="sm"
              onClick={() => triggerCommand("submit")}
              className="h-8 gap-1.5 border-none bg-[#007acc] px-4 text-xs text-white transition-colors hover:bg-[#0063a5]"
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
