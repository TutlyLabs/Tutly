"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import { isNative } from "@/lib/native";

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (!isNative()) {
      const update = () => setOnline(navigator.onLine);
      update();
      window.addEventListener("online", update);
      window.addEventListener("offline", update);
      cleanup = () => {
        window.removeEventListener("online", update);
        window.removeEventListener("offline", update);
      };
      return cleanup;
    }

    let removeListener: (() => Promise<void>) | undefined;
    void (async () => {
      const { Network } = await import("@capacitor/network");
      const status = await Network.getStatus();
      setOnline(status.connected);
      const sub = await Network.addListener("networkStatusChange", (s) => {
        setOnline(s.connected);
      });
      removeListener = sub.remove;
    })();
    return () => {
      void removeListener?.();
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-destructive text-destructive-foreground fixed top-[env(safe-area-inset-top)] right-0 left-0 z-[60] flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium"
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span>You&apos;re offline. Changes will sync when you reconnect.</span>
    </div>
  );
}
