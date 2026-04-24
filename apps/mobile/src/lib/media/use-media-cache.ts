import { useCallback, useEffect, useState } from "react";

import type { CachedMedia } from "./media-cache";
import {
  cacheRemoteAsset,
  getCachedMedia,
  removeCachedMedia,
} from "./media-cache";

export function useMediaCache({
  cacheKey,
  title,
  remoteUrl,
}: {
  cacheKey: string;
  title: string;
  remoteUrl?: string | null;
}) {
  const [cached, setCached] = useState<CachedMedia | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setCached(await getCachedMedia(cacheKey));
  }, [cacheKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async () => {
    if (!remoteUrl) return;
    setLoading(true);
    try {
      setCached(await cacheRemoteAsset({ key: cacheKey, title, remoteUrl }));
    } finally {
      setLoading(false);
    }
  }, [cacheKey, remoteUrl, title]);

  const remove = useCallback(async () => {
    setLoading(true);
    try {
      await removeCachedMedia(cacheKey);
      setCached(null);
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  return {
    cached,
    loading,
    refresh,
    save,
    remove,
  };
}
