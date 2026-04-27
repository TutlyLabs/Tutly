"use client";

import { Fingerprint } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@tutly/ui/button";

import {
  authenticateBiometric,
  getBiometricLockEnabled,
} from "@/lib/biometric";
import { isNative } from "@/lib/native";

const LOCK_AFTER_BACKGROUND_MS = 60_000;

export default function BiometricLock() {
  const [locked, setLocked] = useState(false);
  const promptingRef = useRef(false);

  const promptUnlock = async () => {
    if (promptingRef.current) return;
    promptingRef.current = true;
    try {
      const ok = await authenticateBiometric("Unlock Tutly");
      if (ok) setLocked(false);
    } finally {
      promptingRef.current = false;
    }
  };

  useEffect(() => {
    if (!isNative()) return;

    let cancelled = false;
    let lastBackgroundedAt: number | null = null;
    let removeListener: (() => Promise<void>) | undefined;

    void (async () => {
      const enabled = await getBiometricLockEnabled();
      if (cancelled || !enabled) return;

      const { App } = await import("@capacitor/app");
      if (cancelled) return;

      const sub = await App.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) {
          lastBackgroundedAt = Date.now();
          return;
        }
        if (lastBackgroundedAt === null) return;
        const idleMs = Date.now() - lastBackgroundedAt;
        lastBackgroundedAt = null;
        if (idleMs >= LOCK_AFTER_BACKGROUND_MS) {
          setLocked(true);
          void promptUnlock();
        }
      });
      removeListener = sub.remove;

      if (cancelled) {
        void sub.remove();
        return;
      }

      setLocked(true);
      void promptUnlock();
    })();

    return () => {
      cancelled = true;
      void removeListener?.();
    };
  }, []);

  if (!locked) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App locked"
      className="bg-background fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6"
    >
      <Fingerprint className="text-primary h-20 w-20" />
      <div className="text-center">
        <h2 className="text-xl font-semibold">Tutly is locked</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Authenticate to continue
        </p>
      </div>
      <Button onClick={() => void promptUnlock()}>Unlock</Button>
    </div>
  );
}
