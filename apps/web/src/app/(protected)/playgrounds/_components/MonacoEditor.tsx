"use client";

import {
  FileTabs,
  SandpackStack,
  useActiveCode,
  useSandpack,
} from "@codesandbox/sandpack-react";
import Editor from "@monaco-editor/react";

export default function MonacoEditor() {
  const { code, updateCode } = useActiveCode();
  const { sandpack } = useSandpack();
  const languageMap: Record<string, string> = {
    html: "html",
    css: "css",
    js: "javascript",
  };

  return (
    <SandpackStack className="margin-0 h-[95vh]">
      <FileTabs closableTabs />
      <div className="h-screen flex-1 pt-2">
        <Editor
          width="100%"
          height="100%"
          language={
            languageMap[sandpack.activeFile.split(".")[1] as string] ||
            "plaintext"
          }
          theme="vs-light"
          key={sandpack.activeFile}
          value={code}
          onChange={(value) => updateCode(value || "")}
        />
      </div>
    </SandpackStack>
  );
}
