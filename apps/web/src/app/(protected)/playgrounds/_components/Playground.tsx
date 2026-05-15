"use client";

import {
  type SandpackFiles,
  type SandpackPredefinedTemplate,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";

import { useBundlerUrl } from "@/hooks/use-bundler-url";
import type { SessionUser } from "@/lib/auth";

import IDEHeader from "./ide/IDEHeader";
import IDEShell from "./ide/IDEShell";
import { IDEProvider, useIDE } from "./ide/ideStore";
import SubmitAssignment from "./SubmitAssignment";

const defaultFiles: SandpackFiles = {
  "/index.html": `<!DOCTYPE html>
<html>
  <head>
    <title>Hello</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <h1>Hello world!</h1>
    <script src="/index.js"></script>
  </body>
</html>
`,
  "/styles.css": `body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  margin: 2rem;
}
`,
  "/index.js": `console.log("Welcome to Tutly Playgrounds");
`,
};

const titleForTemplate: Partial<Record<SandpackPredefinedTemplate, string>> = {
  static: "HTML · CSS · JS Studio",
  react: "React Studio",
  "react-ts": "React + TS Studio",
  vue: "Vue Studio",
  angular: "Angular Studio",
  svelte: "Svelte Studio",
  vanilla: "Vanilla Studio",
  "vanilla-ts": "Vanilla TS Studio",
  nextjs: "Next.js Studio",
  vite: "Vite Studio",
};

type PlaygroundProps = {
  assignmentId?: string;
  initialFiles?: SandpackFiles;
  template?: SandpackPredefinedTemplate;
  currentUser: SessionUser;
};

const Playground = ({
  assignmentId,
  initialFiles,
  template = "static",
  currentUser,
}: PlaygroundProps) => {
  const bundlerUrl = useBundlerUrl();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const startingFiles = useMemo(
    () => initialFiles ?? defaultFiles,
    [initialFiles],
  );
  const title = titleForTemplate[template] ?? "Studio";
  const sandpackTheme = resolvedTheme === "dark" ? "dark" : "light";

  if (!mounted) return null;

  return (
    <SandpackProvider
      key={sandpackTheme}
      files={startingFiles}
      template={template}
      theme={sandpackTheme}
      options={{ bundlerURL: bundlerUrl }}
    >
      <IDEProvider>
        <AutoOpenEntry startingFiles={startingFiles} template={template} />
        <div className="bg-background fixed inset-0 z-[55] flex flex-col">
          <IDEShell
            template={template}
            topBar={
              <IDEHeader
                title={title}
                rightSlot={
                  assignmentId ? (
                    <SubmitAssignment
                      currentUser={currentUser}
                      assignmentId={assignmentId}
                    />
                  ) : null
                }
              />
            }
          />
        </div>
      </IDEProvider>
    </SandpackProvider>
  );
};

function AutoOpenEntry({
  startingFiles,
  template,
}: {
  startingFiles: SandpackFiles;
  template: SandpackPredefinedTemplate;
}) {
  const { openFile, state } = useIDE();

  useEffect(() => {
    if (state.layout.type === "pane" && state.layout.tabs.length > 0) return;
    const preferred =
      template === "static"
        ? ["/index.html", "/index.js", "/styles.css"]
        : [
            "/App.tsx",
            "/App.jsx",
            "/src/App.tsx",
            "/src/App.jsx",
            "/index.tsx",
            "/index.js",
          ];
    const first =
      preferred.find((p) => startingFiles[p]) ?? Object.keys(startingFiles)[0];
    if (first) openFile(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default Playground;
