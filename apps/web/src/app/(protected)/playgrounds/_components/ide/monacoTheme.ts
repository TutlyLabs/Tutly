import type * as monaco from "monaco-editor";

function hslToHex(hslStr: string): string {
  const m = hslStr.match(
    /hsla?\(\s*([\d.+-]+)\s*,?\s*([\d.+-]+)%\s*,?\s*([\d.+-]+)%(?:\s*[,/]\s*([\d.+-]+%?))?\s*\)/i,
  );
  if (!m) return "#000000";
  const h = parseFloat(m[1]!) / 360;
  const s = parseFloat(m[2]!) / 100;
  const l = parseFloat(m[3]!) / 100;
  const a = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  if (s === 0) {
    const g = Math.round(l * 255);
    return `#${g.toString(16).padStart(2, "0").repeat(3)}`;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return `#${a(f(h + 1 / 3))}${a(f(h))}${a(f(h - 1 / 3))}`;
}

function expandHex(hex: string): string {
  // Monaco rejects 3- and 4-digit hex; always return 6-digit.
  if (/^#[0-9a-f]{3}$/i.test(hex))
    return "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  if (/^#[0-9a-f]{4}$/i.test(hex))
    return "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  return hex;
}

function cssVar(name: string, fallback = "#000000"): string {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  if (!raw) return fallback;
  if (raw.startsWith("#")) return expandHex(raw);
  if (raw.startsWith("hsl")) return hslToHex(raw);
  return fallback;
}

function blendHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255;
  const ag = (pa >> 8) & 255;
  const ab = pa & 255;
  const br = (pb >> 16) & 255;
  const bg = (pb >> 8) & 255;
  const bb = pb & 255;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `#${rr.toString(16).padStart(2, "0")}${rg.toString(16).padStart(2, "0")}${rb.toString(16).padStart(2, "0")}`;
}

export function buildTutlyTheme(
  isDark: boolean,
): monaco.editor.IStandaloneThemeData {
  const bg = cssVar("--background", isDark ? "#0e1117" : "#ffffff");
  const fg = cssVar("--foreground", isDark ? "#fafafa" : "#0a0a0a");
  const muted = cssVar("--muted", isDark ? "#1e222a" : "#f1f5f9");
  const mutedFg = cssVar("--muted-foreground", isDark ? "#9ca3af" : "#64748b");
  const border = cssVar("--border", isDark ? "#262a33" : "#e2e8f0");
  const primary = cssVar("--primary", "#3b82f6");
  const accent = cssVar("--accent", isDark ? "#1f2937" : "#f1f5f9");

  const selection = blendHex(bg, primary, 0.28);
  const lineHL = blendHex(bg, fg, 0.05);
  const cursor = primary;
  const inactiveSel = blendHex(bg, primary, 0.12);

  const tokenComment = isDark ? "7f8693" : "8e8e93";
  const tokenString = isDark ? "a3e6a0" : "5a8a3a";
  const tokenNumber = isDark ? "f0a07d" : "b06000";
  const tokenKeyword = isDark ? "c084fc" : "8b5cf6";
  const tokenFn = isDark ? "fbbf77" : "b45309";
  const tokenType = isDark ? "7dd3fc" : "0369a1";
  const tokenVar = isDark ? "e6edf3" : "111827";
  const tokenAttr = isDark ? "a5d6ff" : "0c4a6e";
  const tokenTag = isDark ? "ff9aa7" : "be123c";

  return {
    base: isDark ? "vs-dark" : "vs",
    inherit: true,
    rules: [
      { token: "", foreground: fg.replace("#", "") },
      { token: "comment", foreground: tokenComment, fontStyle: "italic" },
      { token: "string", foreground: tokenString },
      { token: "string.escape", foreground: tokenString },
      { token: "number", foreground: tokenNumber },
      { token: "keyword", foreground: tokenKeyword, fontStyle: "bold" },
      { token: "operator", foreground: tokenKeyword },
      { token: "identifier", foreground: tokenVar },
      { token: "variable", foreground: tokenVar },
      { token: "variable.predefined", foreground: tokenType },
      { token: "type", foreground: tokenType },
      { token: "type.identifier", foreground: tokenType },
      { token: "function", foreground: tokenFn },
      { token: "delimiter", foreground: mutedFg.replace("#", "") },
      { token: "tag", foreground: tokenTag },
      { token: "metatag", foreground: tokenTag },
      { token: "attribute.name", foreground: tokenAttr },
      { token: "attribute.value", foreground: tokenString },
      { token: "key", foreground: tokenAttr },
      { token: "key.json", foreground: tokenAttr },
      { token: "string.value.json", foreground: tokenString },
      { token: "punctuation", foreground: mutedFg.replace("#", "") },
    ],
    colors: {
      "editor.background": bg,
      "editor.foreground": fg,
      "editorLineNumber.foreground": mutedFg,
      "editorLineNumber.activeForeground": fg,
      "editorCursor.foreground": cursor,
      "editor.selectionBackground": selection,
      "editor.inactiveSelectionBackground": inactiveSel,
      "editor.lineHighlightBackground": lineHL,
      "editor.lineHighlightBorder": "#00000000",
      "editorIndentGuide.background": border,
      "editorIndentGuide.activeBackground": mutedFg,
      "editor.findMatchBackground": blendHex(bg, primary, 0.35),
      "editor.findMatchHighlightBackground": blendHex(bg, primary, 0.18),
      "editorBracketMatch.background": blendHex(bg, primary, 0.2),
      "editorBracketMatch.border": primary,
      "editorBracketHighlight.foreground1": "#e6c07b",
      "editorBracketHighlight.foreground2": "#56b6c2",
      "editorBracketHighlight.foreground3": "#c678dd",
      "editorBracketHighlight.foreground4": "#98c379",
      "editorBracketHighlight.foreground5": "#61afef",
      "editorBracketHighlight.foreground6": "#e06c75",
      "editorGutter.background": bg,
      "editorWhitespace.foreground": border,
      "editorWidget.background": muted,
      "editorWidget.foreground": fg,
      "editorWidget.border": border,
      "editorSuggestWidget.background": muted,
      "editorSuggestWidget.border": border,
      "editorSuggestWidget.foreground": fg,
      "editorSuggestWidget.selectedBackground": accent,
      "editorSuggestWidget.highlightForeground": primary,
      "editorHoverWidget.background": muted,
      "editorHoverWidget.border": border,
      "scrollbarSlider.background": blendHex(bg, fg, 0.12),
      "scrollbarSlider.hoverBackground": blendHex(bg, fg, 0.18),
      "scrollbarSlider.activeBackground": blendHex(bg, fg, 0.25),
      "minimap.background": bg,
      "minimapSlider.background": blendHex(bg, fg, 0.08),
      "minimapSlider.hoverBackground": blendHex(bg, fg, 0.14),
      "minimapSlider.activeBackground": blendHex(bg, fg, 0.2),
      "editorOverviewRuler.border": border,
      "editorError.foreground": "#f87171",
      "editorWarning.foreground": "#fbbf24",
      "editorInfo.foreground": "#60a5fa",
    },
  };
}
