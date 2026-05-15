"use client";

import {
  SandpackPreview,
  type SandpackPredefinedTemplate,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { Maximize, Minimize, RotateCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@tutly/utils";

import IconButton from "./IconButton";

type StaticPreviewProps = {
  onConsoleLog?: (log: { type: string; args: unknown[] }) => void;
  onClear?: () => void;
  reloadToken: number;
};

function StaticPreview({
  onConsoleLog,
  onClear,
  reloadToken,
}: StaticPreviewProps) {
  const { sandpack } = useSandpack();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const onClearRef = useRef(onClear);
  onClearRef.current = onClear;

  const srcDoc = useMemo(() => {
    const files = sandpack.files;
    let html =
      files["/index.html"]?.code ??
      "<!DOCTYPE html><html><head></head><body></body></html>";

    // Strip root-relative <link>/<script> refs — srcDoc has no base URL so
    // they'd 404 against the parent origin. External (http/https) refs stay.
    // Loop until stable so nested matches (e.g. <scr<script>ipt>) cannot survive.
    const stripPattern =
      /<link\b[^>]*\bhref\s*=\s*["']\/[^"']*["'][^>]*>|<script\b[^>]*\bsrc\s*=\s*["']\/[^"']*["'][^>]*>\s*<\/script>/gi;
    let prevHtml: string;
    do {
      prevHtml = html;
      html = html.replace(stripPattern, "");
    } while (html !== prevHtml);

    const styles: string[] = [];
    const scripts: string[] = [];
    for (const [path, file] of Object.entries(files)) {
      if (path === "/index.html" || path === "/package.json") continue;
      if (path.endsWith(".css")) {
        styles.push(`<style data-src="${path}">\n${file.code}\n</style>`);
      } else if (path.endsWith(".js")) {
        scripts.push(`<script data-src="${path}">\n${file.code}\n</script>`);
      }
    }

    const override = `
<script>
(function() {
  function send(type, args) {
    try {
      window.parent.postMessage({ source: 'tutly-static-console', type, args: args.map(a => {
        try { return typeof a === 'object' ? JSON.parse(JSON.stringify(a)) : a; } catch(_) { return String(a); }
      }) }, '*');
    } catch(_) {}
  }
  ['log','error','warn','info','debug'].forEach(function(m) {
    var old = console[m];
    console[m] = function() {
      send(m, Array.from(arguments));
      old.apply(console, arguments);
    };
  });
  window.addEventListener('error', function(e){ send('error', [e.message + ' @ ' + (e.filename || '') + ':' + (e.lineno||0)]); });
  window.addEventListener('unhandledrejection', function(e){ send('error', ['Unhandled: ' + (e.reason && e.reason.message || e.reason)]); });
})();
</script>`;

    html = html.replace("</head>", `${styles.join("\n")}\n</head>`);
    html = html.replace(
      "</body>",
      `${override}\n${scripts.join("\n")}\n</body>`,
    );

    return html;
  }, [sandpack.files]);

  // Push srcDoc to the iframe imperatively, debounced — re-binding the React
  // prop on every keystroke forces a full iframe navigation (visible flicker).
  const lastWrittenRef = useRef<string | null>(null);
  const mountedRef = useRef(false);
  useEffect(() => {
    const el = iframeRef.current;
    if (!el) return;
    const apply = () => {
      if (lastWrittenRef.current === srcDoc) return;
      lastWrittenRef.current = srcDoc;
      el.srcdoc = srcDoc;
      onClearRef.current?.();
    };
    if (!mountedRef.current) {
      mountedRef.current = true;
      apply();
      return;
    }
    const id = window.setTimeout(apply, 350);
    return () => window.clearTimeout(id);
  }, [srcDoc]);

  // Manual reload (refresh button) — force the iframe to re-navigate.
  useEffect(() => {
    const el = iframeRef.current;
    if (!el || reloadToken === 0) return;
    lastWrittenRef.current = srcDoc;
    el.srcdoc = srcDoc;
    onClearRef.current?.();
  }, [reloadToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const cb = onConsoleLog;
    if (!cb) return;
    function handle(e: MessageEvent) {
      if (e.data && e.data.source === "tutly-static-console") {
        cb!({ type: e.data.type, args: e.data.args });
      }
    }
    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, [onConsoleLog]);

  return (
    <iframe
      ref={iframeRef}
      className="bg-background h-full w-full"
      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
    />
  );
}

type PreviewPaneProps = {
  template?: SandpackPredefinedTemplate;
  onStaticLog?: (log: { type: string; args: unknown[] }) => void;
  onClearStaticLogs?: () => void;
};

export default function PreviewPane({
  template,
  onStaticLog,
  onClearStaticLogs,
}: PreviewPaneProps) {
  const [zoom] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const { dispatch } = useSandpack();

  const isStatic = template === "static";

  const handleReload = useCallback(() => {
    if (isStatic) {
      setReloadToken((t) => t + 1);
      return;
    }
    try {
      dispatch({ type: "refresh" });
    } catch (e) {
      console.warn("[tutly] preview refresh failed", e);
    }
  }, [isStatic, dispatch]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [fullscreen]);

  // Lock body scroll while fullscreen.
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  return (
    <div
      className={cn(
        "bg-background flex h-full flex-col",
        fullscreen && "fixed inset-0 z-[60] h-screen w-screen shadow-2xl",
      )}
    >
      <div className="bg-muted/40 flex h-9 shrink-0 items-center justify-between gap-2 border-b px-2.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
          <span className="text-muted-foreground text-[10px] font-bold tracking-[0.16em] uppercase">
            Preview
          </span>
          {fullscreen && (
            <span className="text-muted-foreground/70 ml-1 text-[10px]">
              · fullscreen
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <IconButton tooltip="Reload Preview" onClick={handleReload}>
            <RotateCw className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            tooltip={fullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen"}
            onClick={() => setFullscreen((v) => !v)}
          >
            {fullscreen ? (
              <Minimize className="h-3.5 w-3.5" />
            ) : (
              <Maximize className="h-3.5 w-3.5" />
            )}
          </IconButton>
        </div>
      </div>
      <div className="bg-background relative flex-1 overflow-hidden">
        <div
          className="h-full w-full origin-top-left"
          style={{
            transform: `scale(${zoom})`,
            width: `${100 / zoom}%`,
            height: `${100 / zoom}%`,
          }}
        >
          {isStatic ? (
            <StaticPreview
              onConsoleLog={onStaticLog}
              onClear={onClearStaticLogs}
              reloadToken={reloadToken}
            />
          ) : (
            <SandpackPreview
              startRoute=""
              showOpenInCodeSandbox={false}
              showRefreshButton={false}
              showSandpackErrorOverlay
              showOpenNewtab
              style={{ height: "100%", width: "100%", border: "none" }}
              className="ide-sandpack-preview"
            />
          )}
        </div>
      </div>
    </div>
  );
}
