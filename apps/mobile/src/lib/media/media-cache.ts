import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MANIFEST_KEY = "tutly.media-cache.manifest";
const CACHE_DIR = `${FileSystem.documentDirectory || ""}tutly-media/`;

export type CachedMedia = {
  key: string;
  title: string;
  remoteUrl: string;
  localUri: string;
  downloadedAt: number;
  bytes?: number;
};

type Manifest = Record<string, CachedMedia>;

export function isCacheableMediaUrl(url?: string | null) {
  if (!url) return false;
  return /\.(mp4|mov|m4v|mp3|m4a|pdf|zip|png|jpg|jpeg)$/i.test(
    url.split("?")[0] || "",
  );
}

export async function getMediaManifest(): Promise<Manifest> {
  const raw = await AsyncStorage.getItem(MANIFEST_KEY);
  return raw ? (JSON.parse(raw) as Manifest) : {};
}

export async function getCachedMedia(key: string) {
  const manifest = await getMediaManifest();
  const item = manifest[key];
  if (!item) return null;
  const info = await FileSystem.getInfoAsync(item.localUri);
  return info.exists ? item : null;
}

export async function cacheRemoteAsset({
  key,
  title,
  remoteUrl,
}: {
  key: string;
  title: string;
  remoteUrl: string;
}) {
  await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  const extension = remoteUrl.split("?")[0]?.split(".").pop() || "bin";
  const localUri = `${CACHE_DIR}${encodeURIComponent(key)}.${extension}`;
  const result = await FileSystem.downloadAsync(remoteUrl, localUri);
  const info = await FileSystem.getInfoAsync(result.uri);
  const cached: CachedMedia = {
    key,
    title,
    remoteUrl,
    localUri: result.uri,
    downloadedAt: Date.now(),
    bytes: info.exists && "size" in info ? info.size : undefined,
  };
  const manifest = await getMediaManifest();
  manifest[key] = cached;
  await AsyncStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
  return cached;
}

export async function removeCachedMedia(key: string) {
  const manifest = await getMediaManifest();
  const item = manifest[key];
  if (item) {
    await FileSystem.deleteAsync(item.localUri, { idempotent: true });
    delete manifest[key];
    await AsyncStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
  }
}
