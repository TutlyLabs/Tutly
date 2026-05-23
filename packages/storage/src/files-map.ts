import { getDisk } from "./disk";

export type FilesMap = Record<string, string>;

// Sandpack path → safe object key. Preserves "/" for bucket-browser hierarchy.
function sanitisePath(rel: string): string {
  return rel
    .replace(/^\/+/, "")
    .replace(/\\/g, "/")
    .split("/")
    .filter((s) => s.length > 0 && s !== "." && s !== "..")
    .map((seg) => seg.replace(/[^A-Za-z0-9_!.\- ]/g, "_"))
    .join("/");
}

export async function writeFilesMap(
  prefix: string,
  files: FilesMap,
): Promise<void> {
  const disk = getDisk();
  // Wipe any prior contents for idempotent writes.
  await disk.deleteAll(prefix);
  const seen = new Map<string, string>();
  const tasks: Promise<void>[] = [];
  for (const [path, content] of Object.entries(files)) {
    let rel = sanitisePath(path);
    if (!rel) continue;
    const existingOriginal = seen.get(rel);
    if (existingOriginal !== undefined && existingOriginal !== path) {
      // Sanitisation collision — disambiguate with a short hash suffix.
      const { createHash } = await import("node:crypto");
      const suffix = createHash("sha1").update(path).digest("hex").slice(0, 8);
      const dot = rel.lastIndexOf(".");
      rel =
        dot > rel.lastIndexOf("/")
          ? `${rel.slice(0, dot)}.${suffix}${rel.slice(dot)}`
          : `${rel}.${suffix}`;
    }
    seen.set(rel, path);
    tasks.push(disk.put(`${prefix}/${rel}`, content));
  }
  await Promise.all(tasks);
}

async function* iterAll(prefix: string) {
  const disk = getDisk();
  let token: string | undefined;
  do {
    const page = await disk.listAll(prefix, {
      recursive: true,
      paginationToken: token,
    });
    for (const obj of page.objects) yield obj;
    token = page.paginationToken;
  } while (token);
}

export async function readFilesMap(prefix: string): Promise<FilesMap | null> {
  const disk = getDisk();
  const out: FilesMap = {};
  let found = false;
  for await (const obj of iterAll(prefix)) {
    if (!obj.isFile) continue;
    found = true;
    const content = await disk.get(obj.key);
    const rel = obj.key.slice(prefix.length + 1);
    out[`/${rel}`] = content;
  }
  return found ? out : null;
}

export async function existsAtPrefix(prefix: string): Promise<boolean> {
  for await (const obj of iterAll(prefix)) {
    if (obj.isFile) return true;
  }
  return false;
}
