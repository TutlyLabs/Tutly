import { isNative } from "@/lib/native";

export interface OfflineVideoMeta {
  videoId: string;
  remoteMasterUrl: string;
  localPlaylistUri: string;
  totalBytes: number;
  downloadedAt: string;
  segmentCount: number;
  rendition: string;
  /** Optional class context for nicer Downloads list rendering. */
  classTitle?: string;
  classId?: string;
  courseId?: string;
  thumbnailUrl?: string;
  durationSec?: number;
}

interface DownloadProgress {
  pct: number;
  downloadedBytes: number;
  segmentsDone: number;
  segmentsTotal: number;
}

export interface DownloadOptions {
  classTitle?: string;
  classId?: string;
  courseId?: string;
  thumbnailUrl?: string;
  durationSec?: number;
}

const PREF_KEY = "tutly:offline-videos";
const TARGET_RENDITION = "720p";

export async function isCapacitorOfflineSupported(): Promise<boolean> {
  return isNative();
}

async function readMeta(): Promise<Record<string, OfflineVideoMeta>> {
  if (!isNative()) return {};
  const { Preferences } = await import("@capacitor/preferences");
  const { value } = await Preferences.get({ key: PREF_KEY });
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, OfflineVideoMeta>;
  } catch {
    return {};
  }
}

async function writeMeta(map: Record<string, OfflineVideoMeta>): Promise<void> {
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.set({ key: PREF_KEY, value: JSON.stringify(map) });
}

export async function getOfflineVideo(
  videoId: string,
): Promise<OfflineVideoMeta | null> {
  if (!isNative()) return null;
  const map = await readMeta();
  return map[videoId] ?? null;
}

export async function listOfflineVideos(): Promise<OfflineVideoMeta[]> {
  const map = await readMeta();
  return Object.values(map);
}

export async function removeOfflineVideo(videoId: string): Promise<void> {
  if (!isNative()) return;
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  try {
    await Filesystem.rmdir({
      path: `tutly/videos/${videoId}`,
      directory: Directory.Data,
      recursive: true,
    });
  } catch {
    /* ignore */
  }
  const map = await readMeta();
  delete map[videoId];
  await writeMeta(map);
}

export async function downloadVideo(
  videoId: string,
  masterPlaylistUrl: string,
  onProgress: (p: DownloadProgress) => void,
  options: DownloadOptions = {},
  signal?: AbortSignal,
): Promise<OfflineVideoMeta> {
  if (!isNative()) {
    throw new Error("Offline download is only available on the mobile app");
  }
  const { Filesystem, Directory, Encoding } = await import(
    "@capacitor/filesystem"
  );
  const { Capacitor } = await import("@capacitor/core");

  // 1. Fetch master playlist
  const masterRes = await fetch(masterPlaylistUrl, { signal });
  if (!masterRes.ok) {
    throw new Error(`master playlist HTTP ${masterRes.status}`);
  }
  const masterText = await masterRes.text();
  const variants = parseMaster(masterText);

  const chosen =
    variants.find((v) => v.uri.includes(TARGET_RENDITION)) ??
    variants.find((v) => v.uri.includes("480p")) ??
    variants[0];
  if (!chosen) throw new Error("No HLS renditions found");

  const variantUrl = new URL(chosen.uri, masterPlaylistUrl).toString();
  const variantRes = await fetch(variantUrl, { signal });
  if (!variantRes.ok) {
    throw new Error(`variant playlist HTTP ${variantRes.status}`);
  }
  const variantText = await variantRes.text();
  const segUris = parseVariantSegments(variantText);

  const baseDir = `tutly/videos/${videoId}`;
  try {
    await Filesystem.mkdir({
      path: baseDir,
      directory: Directory.Data,
      recursive: true,
    });
  } catch {
    /* exists */
  }

  let downloadedBytes = 0;
  const localNames: string[] = [];

  for (let i = 0; i < segUris.length; i++) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    const seg = segUris[i]!;
    const segUrl = new URL(seg, variantUrl).toString();
    const res = await fetch(segUrl, { signal });
    if (!res.ok) throw new Error(`segment HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    downloadedBytes += buf.byteLength;

    const localName = `seg${String(i).padStart(4, "0")}.ts`;
    await Filesystem.writeFile({
      path: `${baseDir}/${localName}`,
      data: arrayBufferToBase64(buf),
      directory: Directory.Data,
    });
    localNames.push(localName);

    onProgress({
      pct: Math.round(((i + 1) / segUris.length) * 100),
      downloadedBytes,
      segmentsDone: i + 1,
      segmentsTotal: segUris.length,
    });
  }

  // 2. Rewrite variant playlist with local segment names
  const localPlaylist = rewritePlaylist(variantText, localNames);
  await Filesystem.writeFile({
    path: `${baseDir}/index.m3u8`,
    data: localPlaylist,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  });

  const stat = await Filesystem.getUri({
    path: `${baseDir}/index.m3u8`,
    directory: Directory.Data,
  });
  const localPlaylistUri = Capacitor.convertFileSrc(stat.uri);

  const meta: OfflineVideoMeta = {
    videoId,
    remoteMasterUrl: masterPlaylistUrl,
    localPlaylistUri,
    totalBytes: downloadedBytes,
    downloadedAt: new Date().toISOString(),
    segmentCount: segUris.length,
    rendition: chosen.uri,
    ...(options.classTitle ? { classTitle: options.classTitle } : {}),
    ...(options.classId ? { classId: options.classId } : {}),
    ...(options.courseId ? { courseId: options.courseId } : {}),
    ...(options.thumbnailUrl ? { thumbnailUrl: options.thumbnailUrl } : {}),
    ...(options.durationSec !== undefined
      ? { durationSec: options.durationSec }
      : {}),
  };
  const map = await readMeta();
  map[videoId] = meta;
  await writeMeta(map);
  return meta;
}

function parseMaster(text: string): { uri: string; bandwidth: number }[] {
  const lines = text.split(/\r?\n/);
  const out: { uri: string; bandwidth: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.startsWith("#EXT-X-STREAM-INF:")) {
      const bw = l.match(/BANDWIDTH=(\d+)/);
      const next = lines[i + 1]?.trim();
      if (next && !next.startsWith("#")) {
        out.push({ uri: next, bandwidth: bw ? Number(bw[1]) : 0 });
      }
    }
  }
  return out;
}

function parseVariantSegments(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

function rewritePlaylist(text: string, localNames: string[]): string {
  let i = 0;
  return text
    .split(/\r?\n/)
    .map((line) => {
      const t = line.trim();
      if (!t || t.startsWith("#")) return line;
      const name = localNames[i++];
      return name ?? line;
    })
    .join("\n");
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + CHUNK)),
    );
  }
  return btoa(binary);
}
