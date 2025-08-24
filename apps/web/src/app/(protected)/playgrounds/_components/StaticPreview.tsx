"use client";

import { useSandpack } from "@codesandbox/sandpack-react";
import { useEffect, useRef, useState } from "react";

const StaticPreview = ({
  onConsoleLog = (log: string) => {
    console.log("StaticPreview:", log);
  },
  onClear,
}: {
  onConsoleLog?: (log: string) => void;
  onClear?: () => void;
}) => {
  const { sandpack } = useSandpack();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeSrc, setIframeSrc] = useState("");

  useEffect(() => {
    if (onClear) onClear();
    const files = sandpack.files;

    let html =
      files["/index.html"]?.code ??
      "<!DOCTYPE html><html><head></head><body></body></html>";

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

    const consoleOverride = `
      <script>
        (function() {
          function send(type, args) {
            window.parent.postMessage({ source: 'static-preview-console', type, args }, '*');
          }
          ['log', 'error', 'warn', 'info'].forEach(function(method) {
            var old = console[method];
            console[method] = function() {
              send(method, Array.from(arguments));
              old.apply(console, arguments);
            };
          });
        })();
      </script>
    `;
    html = html.replace(
      "</head>",
      `${styles.join("\n")}
</head>`,
    );
    html = html.replace(
      "</body>",
      `${consoleOverride}\n${scripts.join("\n")}
</body>`,
    );

    const blob = new Blob([html], { type: "text/html" });
    const blobURL = URL.createObjectURL(blob);
    setIframeSrc(blobURL);

    return () => URL.revokeObjectURL(blobURL);
  }, [sandpack.files, onClear]);

  useEffect(() => {
    if (!onConsoleLog) return;
    function handleMessage(event: MessageEvent) {
      if (event.data && event.data.source === "static-preview-console") {
        const { type, args } = event.data;
        onConsoleLog(`[${type}] ${args.join(" ")}`);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onConsoleLog]);

  return (
    <iframe
      ref={iframeRef}
      src={iframeSrc}
      className="h-[100%] w-full overflow-y-scroll bg-white"
      sandbox="allow-scripts allow-same-origin"
    />
  );
};

export default StaticPreview;
