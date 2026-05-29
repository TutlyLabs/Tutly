"use client";

import { useEffect, useRef } from "react";

import type { RunnerClient } from "./RunnerClient";

interface Props {
  client: RunnerClient;
}

export default function RunnerTerminal({ client }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    let disposed = false;
    let detach: (() => void) | null = null;

    (async () => {
      const [{ Terminal }, { FitAddon }, { WebLinksAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
        import("@xterm/addon-web-links"),
      ]);
      await import("@xterm/xterm/css/xterm.css");

      if (disposed) return;

      const term = new Terminal({
        cursorBlink: true,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 13,
        theme: { background: "#0b0f17" },
        convertEol: false,
        scrollback: 4000,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.loadAddon(new WebLinksAddon());
      term.open(el);
      fit.fit();

      const streamId = client.newStreamId("pty");

      client.send({
        type: "pty.open",
        streamId,
        cols: term.cols,
        rows: term.rows,
      });

      const off = client.on(streamId, (frame) => {
        if (frame.type === "pty.data") {
          const dataB64 = (frame as unknown as { dataB64: string }).dataB64;
          const decoded = atob(dataB64);
          const bytes = new Uint8Array(decoded.length);
          for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
          term.write(bytes);
        } else if (frame.type === "pty.close") {
          term.writeln("\r\n\x1b[33m[terminal closed]\x1b[0m");
        }
      });

      const onData = term.onData((data) => {
        client.send({
          type: "pty.data",
          streamId,
          dataB64: btoa(unescape(encodeURIComponent(data))),
        });
      });

      const ro = new ResizeObserver(() => {
        try {
          fit.fit();
          client.send({
            type: "pty.resize",
            streamId,
            cols: term.cols,
            rows: term.rows,
          });
        } catch {
          /* ignore */
        }
      });
      ro.observe(el);

      detach = () => {
        ro.disconnect();
        onData.dispose();
        off();
        try {
          client.send({ type: "pty.close", streamId });
        } catch {
          /* ignore */
        }
        term.dispose();
      };
      cleanupRef.current = detach;
    })();

    return () => {
      disposed = true;
      if (detach) detach();
    };
  }, [client]);

  return <div ref={containerRef} className="h-full w-full" />;
}
