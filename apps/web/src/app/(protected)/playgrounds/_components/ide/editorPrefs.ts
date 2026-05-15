"use client";

import { useSyncExternalStore } from "react";

export type CursorStyle = "line" | "block" | "underline" | "line-thin";
export type CursorBlink = "smooth" | "blink" | "expand" | "solid" | "phase";
export type RenderWS = "none" | "boundary" | "selection" | "all";
export type MinimapSide = "right" | "left";

export type EditorPrefs = {
  fontSize: number;
  fontFamily: string;
  fontLigatures: boolean;
  lineHeight: number;
  tabSize: number;
  insertSpaces: boolean;
  wordWrap: boolean;
  minimap: boolean;
  minimapSide: MinimapSide;
  minimapRenderCharacters: boolean;
  minimapScale: 1 | 2 | 3;
  lineNumbers: boolean;
  stickyScroll: boolean;
  cursorStyle: CursorStyle;
  cursorBlinking: CursorBlink;
  renderWhitespace: RenderWS;
  bracketPairColorization: boolean;
  indentGuides: boolean;
  autoClosingBrackets: boolean;
  trimTrailingWhitespaceOnSave: boolean;
  formatOnPaste: boolean;
  formatOnType: boolean;
  smoothScrolling: boolean;
  mouseWheelZoom: boolean;
};

export const DEFAULT_PREFS: EditorPrefs = {
  fontSize: 12.5,
  fontFamily:
    '"JetBrains Mono", "Fira Code", Menlo, Consolas, "Liberation Mono", monospace',
  fontLigatures: true,
  lineHeight: 1.5,
  tabSize: 2,
  insertSpaces: true,
  wordWrap: true,
  minimap: false,
  minimapSide: "right",
  minimapRenderCharacters: false,
  minimapScale: 1,
  lineNumbers: true,
  stickyScroll: true,
  cursorStyle: "line",
  cursorBlinking: "smooth",
  renderWhitespace: "selection",
  bracketPairColorization: true,
  indentGuides: true,
  autoClosingBrackets: true,
  trimTrailingWhitespaceOnSave: false,
  formatOnPaste: true,
  formatOnType: false,
  smoothScrolling: true,
  mouseWheelZoom: true,
};

const STORAGE_KEY = "tutly.ide.editorPrefs.v2";

let current: EditorPrefs = DEFAULT_PREFS;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) current = { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
}

function notify() {
  listeners.forEach((l) => l());
}

export function getEditorPrefs(): EditorPrefs {
  return current;
}

export function setEditorPrefs(patch: Partial<EditorPrefs>) {
  current = { ...current, ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {}
  notify();
}

export function resetEditorPrefs() {
  current = DEFAULT_PREFS;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
  notify();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useEditorPrefs(): EditorPrefs {
  return useSyncExternalStore(subscribe, getEditorPrefs, getEditorPrefs);
}

export const FONT_FAMILIES: { label: string; value: string }[] = [
  {
    label: "JetBrains Mono",
    value:
      '"JetBrains Mono", "Fira Code", Menlo, Consolas, "Liberation Mono", monospace',
  },
  {
    label: "Fira Code",
    value: '"Fira Code", "JetBrains Mono", Menlo, Consolas, monospace',
  },
  {
    label: "Cascadia Code",
    value: '"Cascadia Code", "JetBrains Mono", Menlo, monospace',
  },
  {
    label: "System Mono",
    value: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
];
