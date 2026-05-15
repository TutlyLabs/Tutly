"use client";

import Editor, { useMonaco } from "@monaco-editor/react";
import { useSandpack } from "@codesandbox/sandpack-react";
import { useTheme } from "next-themes";
import { Lock, Pin, X } from "lucide-react";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
} from "react";

import { useEditorPrefs } from "./editorPrefs";
import { FileIcon, getLanguage } from "./FileIcon";
import { formatCode } from "./format";
import {
  ClosableTabsContext,
  EditableScopeContext,
  isPathWritable,
} from "./ideOptions";
import { buildTutlyTheme } from "./monacoTheme";

import { cn } from "@tutly/utils";

import { getDisplayName } from "./fileMeta";
import { useIDE } from "./ideStore";
import type { DropEdge, Pane, Tab } from "./types";

const tabMime = "application/x-tutly-tab";
const fileMime = "application/x-tutly-path";

type DragPayload = {
  paneId: string;
  tabId: string;
};

function edgeFromPoint(
  e: { clientX: number; clientY: number },
  rect: DOMRect,
): DropEdge {
  const px = (e.clientX - rect.left) / rect.width;
  const py = (e.clientY - rect.top) / rect.height;
  const edgeFraction = 0.22;
  if (px < edgeFraction) return "left";
  if (px > 1 - edgeFraction) return "right";
  if (py < edgeFraction) return "top";
  if (py > 1 - edgeFraction) return "bottom";
  return "center";
}

export default function EditorPane({ pane }: { pane: Pane }) {
  const {
    state,
    activateTab,
    activatePane,
    closeTab,
    moveTab,
    splitWithTab,
    pinTab,
    openFile,
  } = useIDE();
  const isActive = state.activePaneId === pane.id;
  const activeTab = pane.tabs.find((t) => t.id === pane.activeTabId) ?? null;
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropEdge, setDropEdge] = useState<DropEdge>(null);

  const onPaneDragOver = (e: DragEvent) => {
    const types = e.dataTransfer.types;
    if (!types.includes(tabMime) && !types.includes(fileMime)) return;
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDropEdge(edgeFromPoint(e, rect));
  };

  const onPaneDragLeave = (e: DragEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      setDropEdge(null);
    }
  };

  const onPaneDrop = (e: DragEvent) => {
    e.preventDefault();
    const rawTab = e.dataTransfer.getData(tabMime);
    const rawPath = e.dataTransfer.getData(fileMime);
    const edge = dropEdge;
    setDropEdge(null);
    if (rawTab) {
      try {
        const payload = JSON.parse(rawTab) as DragPayload;
        if (!edge || edge === "center") {
          moveTab(payload.paneId, payload.tabId, pane.id);
        } else {
          splitWithTab(payload.paneId, payload.tabId, pane.id, edge);
        }
      } catch {
        // ignore
      }
      return;
    }
    if (rawPath) {
      openFile(rawPath, pane.id);
    }
  };

  const showRing = isActive && state.layout.type === "split";

  return (
    <div
      ref={containerRef}
      data-pane-id={pane.id}
      className={cn(
        "bg-background relative flex h-full min-h-0 min-w-0 flex-col",
        showRing && "ring-primary/30 ring-1 ring-inset",
      )}
      onMouseDown={() => activatePane(pane.id)}
      onDragOver={onPaneDragOver}
      onDragLeave={onPaneDragLeave}
      onDrop={onPaneDrop}
    >
      <TabStrip
        pane={pane}
        onActivate={(t) => activateTab(pane.id, t)}
        onClose={(t) => closeTab(pane.id, t)}
        onPin={(t) => pinTab(pane.id, t)}
        onMoveTab={(srcPaneId, srcTabId, toIndex) =>
          moveTab(srcPaneId, srcTabId, pane.id, toIndex)
        }
      />
      <div className="relative min-h-0 flex-1">
        {activeTab ? <MonacoCanvas tab={activeTab} /> : <EmptyPaneMessage />}
        {dropEdge && dropEdge !== "center" && <DropIndicator edge={dropEdge} />}
        {dropEdge === "center" && (
          <div className="bg-primary/10 ring-primary/40 pointer-events-none absolute inset-0 ring-1 ring-inset" />
        )}
      </div>
    </div>
  );
}

function EmptyPaneMessage() {
  return (
    <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="bg-muted/40 grid h-14 w-14 place-items-center rounded-md border text-2xl">
        ⌘
      </div>
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">
          Pick a file to start editing
        </p>
        <p className="text-xs">
          Press{" "}
          <kbd className="bg-muted rounded border px-1.5 py-0.5 text-[10px]">
            ⌘P
          </kbd>{" "}
          for quick file open, or{" "}
          <kbd className="bg-muted rounded border px-1.5 py-0.5 text-[10px]">
            ⌘⇧P
          </kbd>{" "}
          for the command palette.
        </p>
      </div>
    </div>
  );
}

function DropIndicator({ edge }: { edge: Exclude<DropEdge, "center" | null> }) {
  const styles: Record<typeof edge, string> = {
    left: "left-0 top-0 h-full w-1/2 border-r-2 border-primary",
    right: "right-0 top-0 h-full w-1/2 border-l-2 border-primary",
    top: "left-0 top-0 h-1/2 w-full border-b-2 border-primary",
    bottom: "left-0 bottom-0 h-1/2 w-full border-t-2 border-primary",
  };
  return (
    <div
      className={cn(
        "bg-primary/15 pointer-events-none absolute transition-all",
        styles[edge],
      )}
    />
  );
}

function TabStrip({
  pane,
  onActivate,
  onClose,
  onPin,
  onMoveTab,
}: {
  pane: Pane;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onPin: (id: string) => void;
  onMoveTab: (srcPaneId: string, srcTabId: string, toIndex: number) => void;
}) {
  const [insertIndex, setInsertIndex] = useState<number | null>(null);

  const onStripDragOver = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes(tabMime)) return;
    e.preventDefault();
  };

  const onStripDrop = (e: DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData(tabMime);
    setInsertIndex(null);
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as DragPayload;
      const idx = insertIndex ?? pane.tabs.length;
      onMoveTab(payload.paneId, payload.tabId, idx);
      e.stopPropagation();
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="bg-muted/40 flex h-9 shrink-0 items-stretch gap-px overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      onDragOver={onStripDragOver}
      onDrop={onStripDrop}
    >
      {pane.tabs.map((tab, idx) => (
        <TabChip
          key={tab.id}
          tab={tab}
          paneId={pane.id}
          active={tab.id === pane.activeTabId}
          onActivate={() => onActivate(tab.id)}
          onClose={() => onClose(tab.id)}
          onPin={() => onPin(tab.id)}
          onDragOverPosition={(before) =>
            setInsertIndex(before ? idx : idx + 1)
          }
          highlightLeft={insertIndex === idx}
          highlightRight={
            insertIndex === idx + 1 && idx === pane.tabs.length - 1
          }
        />
      ))}
      <div
        className="flex-1"
        onDragOver={() => setInsertIndex(pane.tabs.length)}
      />
    </div>
  );
}

function TabChip({
  tab,
  paneId,
  active,
  onActivate,
  onClose,
  onPin,
  onDragOverPosition,
  highlightLeft,
  highlightRight,
}: {
  tab: Tab;
  paneId: string;
  active: boolean;
  onActivate: () => void;
  onClose: () => void;
  onPin: () => void;
  onDragOverPosition: (before: boolean) => void;
  highlightLeft: boolean;
  highlightRight: boolean;
}) {
  const name = getDisplayName(tab.path);
  const closableTabs = useContext(ClosableTabsContext);
  const editableScope = useContext(EditableScopeContext);
  const { sandpack } = useSandpack();
  const isReadOnly = !isPathWritable(
    tab.path,
    editableScope,
    sandpack.files[tab.path]?.readOnly,
  );

  const onDragStart = (e: DragEvent) => {
    const payload: DragPayload = { paneId, tabId: tab.id };
    e.dataTransfer.setData(tabMime, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes(tabMime)) return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const before = e.clientX < rect.left + rect.width / 2;
    onDragOverPosition(before);
  };

  return (
    <div
      draggable={closableTabs}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onMouseDown={onActivate}
      onAuxClick={(e) => {
        if (e.button === 1 && closableTabs) onClose();
      }}
      className={cn(
        "group border-border/60 relative flex max-w-[220px] cursor-pointer items-center gap-2 border-r px-3 text-[12.5px] transition-colors select-none",
        active
          ? "bg-background text-foreground"
          : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
      )}
    >
      {highlightLeft && (
        <span className="bg-primary pointer-events-none absolute top-1 bottom-1 left-[-1px] w-[2px] rounded-full" />
      )}
      {highlightRight && (
        <span className="bg-primary pointer-events-none absolute top-1 right-[-1px] bottom-1 w-[2px] rounded-full" />
      )}
      <FileIcon path={tab.path} />
      <span className={cn("truncate", isReadOnly && "italic opacity-90")}>
        {name}
      </span>
      <span className="flex items-center gap-0.5">
        {isReadOnly && (
          <Lock
            className="text-muted-foreground/70 h-3 w-3"
            aria-label="Read-only (protected by template)"
          />
        )}
        {tab.pinned && <Pin className="text-primary/80 h-3 w-3" />}
        {closableTabs && (
          <button
            type="button"
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
              onClose();
            }}
            className="hover:bg-accent/80 cursor-pointer rounded p-0.5 opacity-0 group-hover:opacity-100"
            aria-label="Close tab"
            title="Close (⌘W)"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </span>
      {active && (
        <span className="bg-primary pointer-events-none absolute inset-x-0 -bottom-px h-[2px]" />
      )}
    </div>
  );
}

function MonacoCanvas({ tab }: { tab: Tab }) {
  const { sandpack } = useSandpack();
  const file = sandpack.files[tab.path];
  const value = file?.code ?? "";
  const language = getLanguage(tab.path);
  const { resolvedTheme } = useTheme();
  const monaco = useMonaco();
  const isDark = resolvedTheme === "dark";
  const themeName = isDark ? "tutly-dark" : "tutly-light";
  const editableScope = useContext(EditableScopeContext);
  const readOnly = !isPathWritable(tab.path, editableScope, file?.readOnly);

  const applyTheme = useCallback(() => {
    if (!monaco) return;
    monaco.editor.defineTheme("tutly-dark", buildTutlyTheme(true) as any);
    monaco.editor.defineTheme("tutly-light", buildTutlyTheme(false) as any);
    monaco.editor.setTheme(themeName);
  }, [monaco, themeName]);

  useEffect(() => {
    applyTheme();
    const obs = new MutationObserver(() => {
      requestAnimationFrame(applyTheme);
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });
    return () => obs.disconnect();
  }, [applyTheme]);

  const beforeMount = useCallback((m: any) => {
    m.editor.defineTheme("tutly-dark", buildTutlyTheme(true) as any);
    m.editor.defineTheme("tutly-light", buildTutlyTheme(false) as any);

    const ts = m.languages.typescript;
    if (ts) {
      const compilerOptions = {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        jsx: ts.JsxEmit.React,
        jsxFactory: "React.createElement",
        jsxFragmentFactory: "React.Fragment",
        allowJs: true,
        checkJs: false,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        allowNonTsExtensions: true,
        isolatedModules: true,
        resolveJsonModule: true,
        skipLibCheck: true,
      };
      ts.typescriptDefaults.setCompilerOptions(compilerOptions);
      ts.javascriptDefaults.setCompilerOptions(compilerOptions);

      // Mute "Cannot find module" diagnostics.
      const diag = {
        noSemanticValidation: true,
        noSyntaxValidation: false,
        noSuggestionDiagnostics: true,
        diagnosticCodesToIgnore: [
          2304, 2305, 2307, 2503, 2552, 2580, 2691, 6133, 7016, 7026, 7031,
        ],
      };
      ts.typescriptDefaults.setDiagnosticsOptions(diag);
      ts.javascriptDefaults.setDiagnosticsOptions(diag);
    }
  }, []);

  const onChange = useCallback(
    (v?: string) => {
      if (readOnly) return;
      sandpack.updateFile(tab.path, v ?? "");
    },
    [sandpack, tab.path, readOnly],
  );

  const prefs = useEditorPrefs();
  const options = useMemo(
    () => ({
      readOnly,
      readOnlyMessage: readOnly
        ? { value: "This file is protected by the template." }
        : undefined,
      minimap: {
        enabled: prefs.minimap,
        side: prefs.minimapSide,
        renderCharacters: prefs.minimapRenderCharacters,
        scale: prefs.minimapScale,
      },
      fontSize: prefs.fontSize,
      fontFamily: prefs.fontFamily,
      fontLigatures: prefs.fontLigatures,
      lineHeight: prefs.lineHeight,
      lineNumbers: (prefs.lineNumbers ? "on" : "off") as "on" | "off",
      smoothScrolling: prefs.smoothScrolling,
      cursorStyle: prefs.cursorStyle,
      cursorBlinking: prefs.cursorBlinking,
      cursorSmoothCaretAnimation: "on" as const,
      renderLineHighlight: "all" as const,
      renderWhitespace: prefs.renderWhitespace,
      bracketPairColorization: { enabled: prefs.bracketPairColorization },
      guides: {
        indentation: prefs.indentGuides,
        bracketPairs: prefs.bracketPairColorization,
        bracketPairsHorizontal: "active" as const,
      },
      autoClosingBrackets: (prefs.autoClosingBrackets
        ? "languageDefined"
        : "never") as "languageDefined" | "never",
      autoClosingQuotes: (prefs.autoClosingBrackets
        ? "languageDefined"
        : "never") as "languageDefined" | "never",
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: prefs.tabSize,
      insertSpaces: prefs.insertSpaces,
      detectIndentation: false,
      padding: { top: 14, bottom: 14 },
      wordWrap: (prefs.wordWrap ? "on" : "off") as "on" | "off",
      stickyScroll: { enabled: prefs.stickyScroll },
      mouseWheelZoom: prefs.mouseWheelZoom,
      formatOnPaste: prefs.formatOnPaste,
      formatOnType: prefs.formatOnType,
      smoothScrollingDuration: 80,
      contextmenu: true,
      "semanticHighlighting.enabled": true,
      scrollbar: {
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
        useShadows: false,
      },
    }),
    [prefs, readOnly],
  );

  const handleMount = useCallback((editor: any, monacoApi: any) => {
    // Disable native spellcheck.
    const dom = editor.getDomNode?.() as HTMLElement | null;
    if (dom) {
      dom.setAttribute("spellcheck", "false");
      dom.querySelectorAll("textarea, [contenteditable]").forEach((el) => {
        (el as HTMLElement).setAttribute("spellcheck", "false");
        (el as HTMLElement).setAttribute("autocorrect", "off");
        (el as HTMLElement).setAttribute("autocapitalize", "off");
      });
      const obs = new MutationObserver(() => {
        dom.querySelectorAll("textarea, [contenteditable]").forEach((el) => {
          if ((el as HTMLElement).getAttribute("spellcheck") !== "false") {
            (el as HTMLElement).setAttribute("spellcheck", "false");
          }
        });
      });
      obs.observe(dom, { childList: true, subtree: true });
    }

    const onFormatEvent = () => {
      const action = editor.getAction?.("tutly.format");
      if (action) void action.run();
    };
    window.addEventListener("tutly:format-document", onFormatEvent);
    editor.onDidDispose(() => {
      window.removeEventListener("tutly:format-document", onFormatEvent);
    });

    editor.addAction({
      id: "tutly.openQuickFile",
      label: "Open File…",
      keybindings: [monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.KeyP],
      run: () => {
        window.dispatchEvent(
          new CustomEvent("tutly:open-palette", { detail: { mode: "files" } }),
        );
      },
    });
    editor.addAction({
      id: "tutly.commandPalette",
      label: "Command Palette",
      keybindings: [
        monacoApi.KeyMod.CtrlCmd |
          monacoApi.KeyMod.Shift |
          monacoApi.KeyCode.KeyP,
      ],
      run: () => {
        window.dispatchEvent(
          new CustomEvent("tutly:open-palette", {
            detail: { mode: "commands" },
          }),
        );
      },
    });
    editor.addAction({
      id: "tutly.toggleSidebar",
      label: "Toggle Sidebar",
      keybindings: [monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.KeyB],
      run: () => window.dispatchEvent(new CustomEvent("tutly:toggle-sidebar")),
    });
    editor.addAction({
      id: "tutly.togglePanel",
      label: "Toggle Bottom Panel",
      keybindings: [monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.KeyJ],
      run: () => window.dispatchEvent(new CustomEvent("tutly:toggle-panel")),
    });
    editor.addAction({
      id: "tutly.splitRight",
      label: "Split Editor Right",
      keybindings: [monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.Backslash],
      run: () => window.dispatchEvent(new CustomEvent("tutly:split-right")),
    });
    editor.addAction({
      id: "tutly.format",
      label: "Format Document",
      keybindings: [
        monacoApi.KeyMod.CtrlCmd |
          monacoApi.KeyMod.Shift |
          monacoApi.KeyCode.KeyF,
      ],
      contextMenuGroupId: "1_modification",
      contextMenuOrder: 1,
      run: async (ed: any) => {
        const model = ed.getModel();
        if (!model) return;
        const path = model.uri.path.replace(/^\//, "");
        const formatted = await formatCode(model.getValue(), path);
        if (formatted == null || formatted === model.getValue()) return;
        ed.executeEdits("tutly.format", [
          { range: model.getFullModelRange(), text: formatted },
        ]);
      },
    });
  }, []);

  return (
    <Editor
      key={tab.path}
      path={tab.path}
      defaultLanguage={language}
      language={language}
      theme={themeName}
      value={value}
      onChange={onChange}
      options={options}
      beforeMount={beforeMount}
      onMount={handleMount}
      loading={
        <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
          Loading editor…
        </div>
      }
    />
  );
}
