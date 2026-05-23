// Round-trip helpers for the synthetic `/tutly.json` file shown in the
// instructor's Sandpack tree. Mirrors split/join in @tutly/storage.

import type { SandpackProps } from "@codesandbox/sandpack-react";

export const TUTLY_CONFIG_PATH = "/tutly.json";

type FileMeta = Record<string, Record<string, unknown>>;

// Pulls per-file meta out of `files` into a top-level `fileMeta` block —
// matches the on-disk sidecar shape.
export function buildTutlyConfigContent(template: SandpackProps): string {
  const fileMeta: FileMeta = {};
  const files = (template.files ?? {}) as Record<string, unknown>;
  for (const [path, entry] of Object.entries(files)) {
    if (entry && typeof entry === "object") {
      const e = entry as Record<string, unknown>;
      const meta: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(e)) {
        if (k === "code") continue;
        meta[k] = v;
      }
      if (Object.keys(meta).length > 0) fileMeta[path] = meta;
    }
  }
  // Always include showFileExplorer so instructors can see the knob exists.
  const existingOptions = (template.options ?? {}) as Record<string, unknown>;
  const options: Record<string, unknown> = {
    ...existingOptions,
    showFileExplorer: existingOptions.showFileExplorer ?? false,
  };
  const config: Record<string, unknown> = {
    template: template.template,
    options,
    customSetup: template.customSetup,
  };
  if (Object.keys(fileMeta).length > 0) config.fileMeta = fileMeta;
  return JSON.stringify(config, null, 2);
}

export type ParsedTutlyConfig =
  | { ok: true; config: Record<string, unknown> }
  | { ok: false; error: string };

export function parseTutlyConfig(raw: string): ParsedTutlyConfig {
  try {
    const config = JSON.parse(raw) as Record<string, unknown>;
    return { ok: true, config };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof SyntaxError
          ? `tutly.json: ${err.message}`
          : "tutly.json: invalid",
    };
  }
}
