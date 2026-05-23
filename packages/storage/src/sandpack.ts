import { getDisk } from "./disk";
import { META_FILE } from "./keys";
import { readFilesMap, writeFilesMap, type FilesMap } from "./files-map";

// File content → separate blobs; everything else → tutly.json sidecar.

export type SandpackTemplateShape = {
  template?: string;
  options?: Record<string, unknown>;
  files?: Record<string, unknown>;
  [extra: string]: unknown;
};

function splitFromSandpack(template: SandpackTemplateShape): {
  files: FilesMap;
  meta: Record<string, unknown>;
} {
  const files: FilesMap = {};
  const fileMeta: Record<string, Record<string, unknown>> = {};
  const rawFiles = (template.files ?? {}) as Record<string, unknown>;
  for (const [path, entry] of Object.entries(rawFiles)) {
    if (typeof entry === "string") {
      files[path] = entry;
    } else if (entry && typeof entry === "object") {
      const e = entry as { code?: unknown; [k: string]: unknown };
      files[path] = typeof e.code === "string" ? e.code : "";
      const m: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(e)) {
        if (k === "code") continue;
        m[k] = v;
      }
      if (Object.keys(m).length > 0) fileMeta[path] = m;
    }
  }
  const { files: _f, ...rest } = template;
  void _f;
  const meta = {
    ...rest,
    ...(Object.keys(fileMeta).length > 0 ? { fileMeta } : {}),
  };
  return { files, meta };
}

function joinToSandpack(
  files: FilesMap,
  meta: Record<string, unknown>,
): SandpackTemplateShape {
  const fileMeta =
    (meta as { fileMeta?: Record<string, Record<string, unknown>> }).fileMeta ?? {};
  const { fileMeta: _fm, ...rest } = meta as { fileMeta?: unknown };
  void _fm;
  const out: Record<string, unknown> = {};
  for (const [path, content] of Object.entries(files)) {
    const m = fileMeta[path];
    out[path] = m ? { code: content, ...m } : content;
  }
  return { ...(rest as SandpackTemplateShape), files: out };
}

export async function writeSandpack(
  prefix: string,
  template: SandpackTemplateShape,
): Promise<void> {
  const { files, meta } = splitFromSandpack(template);
  await writeFilesMap(prefix, files);
  await getDisk().put(`${prefix}/${META_FILE}`, JSON.stringify(meta, null, 2));
}

export async function readSandpack(
  prefix: string,
): Promise<SandpackTemplateShape | null> {
  const all = await readFilesMap(prefix);
  if (!all) return null;
  const metaKey = `/${META_FILE}`;
  const metaRaw = all[metaKey];
  let meta: Record<string, unknown> = {};
  if (metaRaw) {
    try {
      meta = JSON.parse(metaRaw) as Record<string, unknown>;
    } catch {
      meta = {};
    }
    delete all[metaKey];
  }
  return joinToSandpack(all, meta);
}
