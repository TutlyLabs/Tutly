"use client";

import { useTheme } from "next-themes";

import { cn } from "@tutly/utils";

import {
  FONT_FAMILIES,
  resetEditorPrefs,
  setEditorPrefs,
  useEditorPrefs,
} from "./editorPrefs";
import { useIDE } from "./ideStore";

export default function SettingsPanel() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { state, toggleSidebar, toggleBottom, togglePreview } = useIDE();
  const prefs = useEditorPrefs();
  const active = theme ?? resolvedTheme ?? "system";

  return (
    <div className="flex h-full flex-col text-[13px]">
      <div className="bg-muted/40 flex h-9 shrink-0 items-center border-b px-2.5 select-none">
        <div className="text-muted-foreground text-[10px] font-bold tracking-[0.16em] uppercase">
          Settings
        </div>
      </div>
      <div className="space-y-5 overflow-auto p-3">
        <Section title="Appearance">
          <div className="grid grid-cols-3 gap-1.5">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={cn(
                  "rounded-md border px-2 py-1.5 text-xs capitalize",
                  active === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-accent/60",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </Section>
        <Section title="Layout">
          <Toggle
            label="Show sidebar"
            value={state.sidebar.visible}
            onChange={toggleSidebar}
          />
          <Toggle
            label="Show bottom panel"
            value={!state.bottomPanel.collapsed}
            onChange={toggleBottom}
          />
          <Toggle
            label="Show preview"
            value={state.preview.visible}
            onChange={togglePreview}
          />
        </Section>
        <Section title="Font">
          <Row label={`Size — ${prefs.fontSize}px`}>
            <input
              type="range"
              min={10}
              max={24}
              step={0.5}
              value={prefs.fontSize}
              onChange={(e) =>
                setEditorPrefs({ fontSize: Number(e.target.value) })
              }
              className="accent-primary w-32"
            />
          </Row>
          <Row label={`Line height — ${prefs.lineHeight}`}>
            <input
              type="range"
              min={1.1}
              max={2.0}
              step={0.05}
              value={prefs.lineHeight}
              onChange={(e) =>
                setEditorPrefs({ lineHeight: Number(e.target.value) })
              }
              className="accent-primary w-32"
            />
          </Row>
          <Row label="Family">
            <select
              value={prefs.fontFamily}
              onChange={(e) => setEditorPrefs({ fontFamily: e.target.value })}
              className="bg-background rounded-md border px-2 py-1 text-xs"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f.label} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </Row>
          <Toggle
            label="Ligatures"
            value={prefs.fontLigatures}
            onChange={() =>
              setEditorPrefs({ fontLigatures: !prefs.fontLigatures })
            }
          />
        </Section>
        <Section title="Editing">
          <Row label="Tab size">
            <div className="flex gap-1">
              {[2, 4, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEditorPrefs({ tabSize: n })}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-xs",
                    prefs.tabSize === n
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-accent/60",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </Row>
          <Toggle
            label="Insert spaces (vs tabs)"
            value={prefs.insertSpaces}
            onChange={() =>
              setEditorPrefs({ insertSpaces: !prefs.insertSpaces })
            }
          />
          <Toggle
            label="Word wrap"
            value={prefs.wordWrap}
            onChange={() => setEditorPrefs({ wordWrap: !prefs.wordWrap })}
          />
          <Toggle
            label="Auto-close brackets / quotes"
            value={prefs.autoClosingBrackets}
            onChange={() =>
              setEditorPrefs({
                autoClosingBrackets: !prefs.autoClosingBrackets,
              })
            }
          />
          <Toggle
            label="Format on paste"
            value={prefs.formatOnPaste}
            onChange={() =>
              setEditorPrefs({ formatOnPaste: !prefs.formatOnPaste })
            }
          />
          <Toggle
            label="Format on type"
            value={prefs.formatOnType}
            onChange={() =>
              setEditorPrefs({ formatOnType: !prefs.formatOnType })
            }
          />
        </Section>
        <Section title="Display">
          <Toggle
            label="Line numbers"
            value={prefs.lineNumbers}
            onChange={() => setEditorPrefs({ lineNumbers: !prefs.lineNumbers })}
          />
          <Toggle
            label="Sticky scroll"
            value={prefs.stickyScroll}
            onChange={() =>
              setEditorPrefs({ stickyScroll: !prefs.stickyScroll })
            }
          />
          <Toggle
            label="Indent guides"
            value={prefs.indentGuides}
            onChange={() =>
              setEditorPrefs({ indentGuides: !prefs.indentGuides })
            }
          />
          <Toggle
            label="Bracket pair colorization"
            value={prefs.bracketPairColorization}
            onChange={() =>
              setEditorPrefs({
                bracketPairColorization: !prefs.bracketPairColorization,
              })
            }
          />
          <Row label="Render whitespace">
            <select
              value={prefs.renderWhitespace}
              onChange={(e) =>
                setEditorPrefs({ renderWhitespace: e.target.value as any })
              }
              className="bg-background rounded-md border px-2 py-1 text-xs"
            >
              <option value="none">None</option>
              <option value="boundary">Boundary</option>
              <option value="selection">Selection</option>
              <option value="all">All</option>
            </select>
          </Row>
          <Toggle
            label="Smooth scrolling"
            value={prefs.smoothScrolling}
            onChange={() =>
              setEditorPrefs({ smoothScrolling: !prefs.smoothScrolling })
            }
          />
          <Toggle
            label="Ctrl+Wheel zoom"
            value={prefs.mouseWheelZoom}
            onChange={() =>
              setEditorPrefs({ mouseWheelZoom: !prefs.mouseWheelZoom })
            }
          />
        </Section>
        <Section title="Cursor">
          <Row label="Style">
            <select
              value={prefs.cursorStyle}
              onChange={(e) =>
                setEditorPrefs({ cursorStyle: e.target.value as any })
              }
              className="bg-background rounded-md border px-2 py-1 text-xs"
            >
              <option value="line">Line</option>
              <option value="line-thin">Line (thin)</option>
              <option value="block">Block</option>
              <option value="underline">Underline</option>
            </select>
          </Row>
          <Row label="Blinking">
            <select
              value={prefs.cursorBlinking}
              onChange={(e) =>
                setEditorPrefs({ cursorBlinking: e.target.value as any })
              }
              className="bg-background rounded-md border px-2 py-1 text-xs"
            >
              <option value="smooth">Smooth</option>
              <option value="blink">Blink</option>
              <option value="expand">Expand</option>
              <option value="phase">Phase</option>
              <option value="solid">Solid</option>
            </select>
          </Row>
        </Section>
        <Section title="Minimap">
          <Toggle
            label="Show minimap"
            value={prefs.minimap}
            onChange={() => setEditorPrefs({ minimap: !prefs.minimap })}
          />
          {prefs.minimap && (
            <>
              <Row label="Side">
                <div className="flex gap-1">
                  {(["right", "left"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditorPrefs({ minimapSide: s })}
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-xs capitalize",
                        prefs.minimapSide === s
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-accent/60",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Row>
              <Row label="Scale">
                <div className="flex gap-1">
                  {([1, 2, 3] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setEditorPrefs({ minimapScale: n })}
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-xs",
                        prefs.minimapScale === n
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-accent/60",
                      )}
                    >
                      {n}×
                    </button>
                  ))}
                </div>
              </Row>
              <Toggle
                label="Render characters"
                value={prefs.minimapRenderCharacters}
                onChange={() =>
                  setEditorPrefs({
                    minimapRenderCharacters: !prefs.minimapRenderCharacters,
                  })
                }
              />
            </>
          )}
        </Section>
        <button
          type="button"
          onClick={resetEditorPrefs}
          className="text-muted-foreground hover:text-foreground hover:bg-accent/40 w-full rounded-md border px-2 py-1.5 text-xs"
        >
          Reset editor settings
        </button>
        <Section title="Shortcuts">
          <ShortcutRow keys="⌘P" label="Quick open file" />
          <ShortcutRow keys="⌘⇧P" label="Command palette" />
          <ShortcutRow keys="⌘B" label="Toggle sidebar" />
          <ShortcutRow keys="⌘J" label="Toggle bottom panel" />
          <ShortcutRow keys="⌘W" label="Close tab" />
          <ShortcutRow keys="⌘\\" label="Split right" />
          <ShortcutRow keys="F2" label="Rename file" />
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="hover:bg-accent/40 flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-xs"
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative inline-flex h-4 w-7 items-center rounded-full transition-colors",
          value ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "bg-background inline-block h-3 w-3 transform rounded-full shadow transition",
            value ? "translate-x-3.5" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

function ShortcutRow({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <kbd className="bg-muted rounded border px-1.5 py-0.5 text-[10px] tracking-wider">
        {keys}
      </kbd>
    </div>
  );
}
