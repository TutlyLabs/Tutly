"use client";

import { useEffect } from "react";

import { useClientSession } from "@/lib/auth/client";
import { isNative } from "@/lib/native";
import { api } from "@/trpc/react";

export default function BadgeSync() {
  const session = useClientSession();
  const userId = session.data?.user?.id;
  const notificationsQuery = api.notifications.getNotifications.useQuery(
    undefined,
    { enabled: Boolean(userId) },
  );

  const unread = notificationsQuery.data?.filter((n) => !n.readAt).length ?? 0;

  useEffect(() => {
    if (!isNative()) return;
    let cancelled = false;
    void (async () => {
      try {
        const { Badge } = await import("@capawesome/capacitor-badge");
        const { isSupported } = await Badge.isSupported();
        if (!isSupported || cancelled) return;
        const perm = await Badge.checkPermissions();
        if (perm.display !== "granted") {
          const req = await Badge.requestPermissions();
          if (req.display !== "granted") return;
        }
        if (unread > 0) await Badge.set({ count: unread });
        else await Badge.clear();
      } catch {
        // plugin unavailable — silently skip
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [unread]);

  return null;
}
