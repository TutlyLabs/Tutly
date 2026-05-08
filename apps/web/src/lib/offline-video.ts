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
  viewerLabel?: string;
}

export interface DownloadProgress {
  pct: number;
  downloadedBytes: number;
  /** Best-effort projection from bytes/segment so far. Null until enough samples. */
  estimatedTotalBytes: number | null;
  segmentsDone: number;
  segmentsTotal: number;
  bytesPerSec: number;
  /** Seconds remaining at current rate; null if we can't estimate yet. */
  etaSec: number | null;
}

export interface DownloadOptions {
  classTitle?: string;
  classId?: string;
  courseId?: string;
  thumbnailUrl?: string;
  durationSec?: number;
  viewerLabel?: string;
  /** Match against variant uri OR name (e.g. "720p"). Falls back to best <=720p, else best. */
  rendition?: string;
}

export interface VariantInfo {
  uri: string;
  bandwidth: number;
  width: number | null;
  height: number | null;
  /** Heuristic display name like "720p" derived from RESOLUTION/NAME or path. */
  name: string;
}

interface PendingDownload {
  videoId: string;
  remoteMasterUrl: string;
  variantAbsoluteUrl: string;
  segUris: string[];
  variantText: string;
  rendition: string;
  startedAt: string;
}

const PREF_KEY = "tutly:offline-videos";
const PENDING_KEY = "tutly:offline-videos:pending";
const SEG_RETRIES = 3;

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

async function readPending(): Promise<Record<string, PendingDownload>> {
  if (!isNative()) return {};
  const { Preferences } = await import("@capacitor/preferences");
  const { value } = await Preferences.get({ key: PENDING_KEY });
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, PendingDownload>;
  } catch {
    return {};
  }
}

async function writePending(
  map: Record<string, PendingDownload>,
): Promise<void> {
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.set({ key: PENDING_KEY, value: JSON.stringify(map) });
}

async function clearPending(videoId: string): Promise<void> {
  const map = await readPending();
  if (!(videoId in map)) return;
  delete map[videoId];
  await writePending(map);
}

export async function getPendingDownload(
  videoId: string,
): Promise<PendingDownload | null> {
  if (!isNative()) return null;
  const map = await readPending();
  return map[videoId] ?? null;
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
  await clearPending(videoId);
}

export async function listVariants(
  masterUrl: string,
  signal?: AbortSignal,
): Promise<VariantInfo[]> {
  const res = await fetch(masterUrl, { signal });
  if (!res.ok) {
    throw new Error(`master playlist HTTP ${res.status}`);
  }
  const text = await res.text();
  return parseMaster(text);
}

function pickVariant(
  variants: VariantInfo[],
  preferred?: string,
): VariantInfo | null {
  if (variants.length === 0) return null;
  if (preferred) {
    const exact = variants.find(
      (v) =>
        v.name === preferred ||
        v.uri === preferred ||
        v.uri.includes(preferred),
    );
    if (exact) return exact;
  }
  // Default: prefer 720p, else 480p, else lowest bandwidth.
  return (
    variants.find((v) => v.name === "720p") ??
    variants.find((v) => v.name === "480p") ??
    [...variants].sort((a, b) => a.bandwidth - b.bandwidth)[0] ??
    null
  );
}

async function fetchSegmentWithRetry(
  url: string,
  signal: AbortSignal | undefined,
): Promise<ArrayBuffer> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= SEG_RETRIES; attempt++) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    try {
      const res = await fetch(url, { signal });
      if (res.ok) return await res.arrayBuffer();
      // 4xx is unlikely to recover; bail.
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`segment HTTP ${res.status}`);
      }
      lastErr = new Error(`segment HTTP ${res.status}`);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") throw e;
      lastErr = e;
    }
    if (attempt < SEG_RETRIES) {
      await new Promise((r) =>
        setTimeout(r, 500 * 2 ** attempt + Math.random() * 250),
      );
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("segment fetch failed");
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

  // Reuse pending state if a previous run got partway through.
  const pendingMap = await readPending();
  let pending = pendingMap[videoId];
  let variantText: string;
  let segUris: string[];
  let variantAbsoluteUrl: string;
  let renditionLabel: string;

  if (pending && pending.remoteMasterUrl === masterPlaylistUrl) {
    variantText = pending.variantText;
    segUris = pending.segUris;
    variantAbsoluteUrl = pending.variantAbsoluteUrl;
    renditionLabel = pending.rendition;
  } else {
    const masterRes = await fetch(masterPlaylistUrl, { signal });
    if (!masterRes.ok) {
      throw new Error(`master playlist HTTP ${masterRes.status}`);
    }
    const variants = parseMaster(await masterRes.text());
    const chosen = pickVariant(variants, options.rendition);
    if (!chosen) throw new Error("No HLS renditions found");

    variantAbsoluteUrl = new URL(chosen.uri, masterPlaylistUrl).toString();
    const variantRes = await fetch(variantAbsoluteUrl, { signal });
    if (!variantRes.ok) {
      throw new Error(`variant playlist HTTP ${variantRes.status}`);
    }
    variantText = await variantRes.text();
    segUris = parseVariantSegments(variantText);
    renditionLabel = chosen.name;

    pending = {
      videoId,
      remoteMasterUrl: masterPlaylistUrl,
      variantAbsoluteUrl,
      segUris,
      variantText,
      rendition: renditionLabel,
      startedAt: new Date().toISOString(),
    };
    pendingMap[videoId] = pending;
    await writePending(pendingMap);
  }

  let downloadedBytes = 0;
  let segmentsDone = 0;
  const localNames: string[] = [];

  // Discover already-downloaded segments via Filesystem.stat. Trust files
  // present with size > 0 — Capacitor writes are atomic.
  for (let i = 0; i < segUris.length; i++) {
    const localName = `seg${String(i).padStart(4, "0")}.ts`;
    localNames.push(localName);
    try {
      const st = await Filesystem.stat({
        path: `${baseDir}/${localName}`,
        directory: Directory.Data,
      });
      const size = (st as { size?: number }).size ?? 0;
      if (size > 0) {
        downloadedBytes += size;
        segmentsDone += 1;
      }
    } catch {
      /* missing — will be downloaded below */
    }
  }

  // Bookkeeping for ETA.
  let lastTickAt = Date.now();
  let lastTickBytes = downloadedBytes;
  let bps = 0;

  const tick = () => {
    const now = Date.now();
    const dt = (now - lastTickAt) / 1000;
    if (dt >= 0.4) {
      const inst = dt > 0 ? (downloadedBytes - lastTickBytes) / dt : 0;
      bps = bps === 0 ? inst : bps * 0.7 + inst * 0.3;
      lastTickAt = now;
      lastTickBytes = downloadedBytes;
    }
    const avgPerSeg = segmentsDone > 0 ? downloadedBytes / segmentsDone : 0;
    const estimatedTotalBytes =
      avgPerSeg > 0 ? Math.round(avgPerSeg * segUris.length) : null;
    const remaining =
      estimatedTotalBytes !== null
        ? Math.max(0, estimatedTotalBytes - downloadedBytes)
        : 0;
    const etaSec =
      bps > 0 && remaining > 0 ? Math.round(remaining / bps) : null;
    onProgress({
      pct: Math.round((segmentsDone / Math.max(1, segUris.length)) * 100),
      downloadedBytes,
      estimatedTotalBytes,
      segmentsDone,
      segmentsTotal: segUris.length,
      bytesPerSec: bps,
      etaSec,
    });
  };

  // Initial tick so the UI shows resume progress immediately.
  tick();

  for (let i = 0; i < segUris.length; i++) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");

    const localName = localNames[i]!;
    // Skip if we already have it from a prior partial run.
    let already = false;
    try {
      const st = await Filesystem.stat({
        path: `${baseDir}/${localName}`,
        directory: Directory.Data,
      });
      if (((st as { size?: number }).size ?? 0) > 0) already = true;
    } catch {
      already = false;
    }
    if (already) continue;

    const seg = segUris[i]!;
    const segUrl = new URL(seg, variantAbsoluteUrl).toString();
    const buf = await fetchSegmentWithRetry(segUrl, signal);
    downloadedBytes += buf.byteLength;

    await Filesystem.writeFile({
      path: `${baseDir}/${localName}`,
      data: arrayBufferToBase64(buf),
      directory: Directory.Data,
    });
    segmentsDone += 1;
    tick();
  }

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
    rendition: renditionLabel,
    ...(options.classTitle ? { classTitle: options.classTitle } : {}),
    ...(options.classId ? { classId: options.classId } : {}),
    ...(options.courseId ? { courseId: options.courseId } : {}),
    ...(options.thumbnailUrl ? { thumbnailUrl: options.thumbnailUrl } : {}),
    ...(options.durationSec !== undefined
      ? { durationSec: options.durationSec }
      : {}),
    ...(options.viewerLabel ? { viewerLabel: options.viewerLabel } : {}),
  };
  const map = await readMeta();
  map[videoId] = meta;
  await writeMeta(map);
  await clearPending(videoId);
  return meta;
}

function deriveVariantName(
  uri: string,
  width: number | null,
  height: number | null,
): string {
  if (height) return `${height}p`;
  // Try to read "480p"/"720p" out of the URI path.
  const m = uri.match(/(\d{3,4})p/);
  if (m && m[1]) return `${m[1]}p`;
  if (width) return `${width}w`;
  return "default";
}

function parseMaster(text: string): VariantInfo[] {
  const lines = text.split(/\r?\n/);
  const out: VariantInfo[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (l.startsWith("#EXT-X-STREAM-INF:")) {
      const bw = l.match(/BANDWIDTH=(\d+)/);
      const res = l.match(/RESOLUTION=(\d+)x(\d+)/);
      const nameTag = l.match(/NAME="([^"]+)"/);
      const next = lines[i + 1]?.trim();
      if (next && !next.startsWith("#")) {
        const width = res ? Number(res[1]) : null;
        const height = res ? Number(res[2]) : null;
        const name = nameTag?.[1] ?? deriveVariantName(next, width, height);
        out.push({
          uri: next,
          bandwidth: bw ? Number(bw[1]) : 0,
          width,
          height,
          name,
        });
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
