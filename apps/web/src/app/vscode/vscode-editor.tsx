"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Send } from "lucide-react";
import { VSCodeLoadingScreen } from "./loading-screen";

export default function VSCodeEditor({ iframeSrc }: { iframeSrc: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isVSCodeReady, setIsVSCodeReady] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'VSCODE_READY') {
        setIsVSCodeReady(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const triggerCommand = (command: 'run' | 'submit') => {
    const iframe = iframeRef.current;
    const win = iframe?.contentWindow;
    if (!iframe || !win) return;

    iframe.focus();
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const char = command === 'run' ? 'r' : 's';

    try {
      const doc = iframe.contentDocument || win.document;
      const event = new KeyboardEvent('keydown', {
        key: char,
        code: `Key${char.toUpperCase()}`,
        ctrlKey: !isMac,
        metaKey: isMac,
        altKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
        view: win,
        composed: true
      });

      (doc.activeElement || doc.body).dispatchEvent(event);
    } catch { }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column"
      }}
    >
      {!hasStarted && (
        <VSCodeLoadingScreen
          isVSCodeReady={isVSCodeReady}
          onStart={() => setHasStarted(true)}
        />
      )}

      {/* Compact Header */}
      <div className="h-10 border-b bg-[#1e1e1e] border-[#2b2b2b] px-4 flex items-center justify-between shrink-0 text-[#cccccc] select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-white">VS Code</span>
            <span className="text-[#5a5a5a]">/</span>
            <span>Editor</span>
          </div>
          <div className="h-4 w-[1px] bg-[#333]" />
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            <span className="opacity-60">Online</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => triggerCommand('run')}
            className="h-7 px-3 text-xs gap-1.5 hover:bg-[#2b2b2b] hover:text-white text-[#cccccc]"
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </Button>
          <Button
            size="sm"
            onClick={() => triggerCommand('submit')}
            className="h-7 px-3 text-xs gap-1.5 bg-[#007acc] hover:bg-[#0063a5] text-white border-none"
          >
            <Send className="h-3.5 w-3.5" />
            Submit
          </Button>
        </div>
      </div>

      <div className="flex-1 relative">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            opacity: hasStarted ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out'
          }}
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}
