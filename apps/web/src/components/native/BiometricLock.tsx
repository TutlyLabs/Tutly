"use client";

import { Fingerprint } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@tutly/ui/button";

import {
  authenticateBiometric,
  getBiometricLockEnabled,
} from "@/lib/biometric";
import { isNative } from "@/lib/native";

const LOCK_AFTER_BACKGROUND_MS = 60_000;

export default function BiometricLock() {
  const [locked, setLocked] = useState(false);
  const [unlockedAt, setUnlockedAt] = useState<number | null>(null);

  const promptUnlock = useCallback(async () => {
    const ok = await authenticateBiometric("Unlock Tutly");
    if (ok) {
      setLocked(false);
      setUnlockedAt(Date.now());
    }
  }, []);

  useEffect(() => {
    if (!isNative()) return;

    let cancelled = false;
    let lastBackgroundedAt: number | null = null;
    let removeListener: (() => Promise<void>) | undefined;

    void (async () => {
      const enabled = await getBiometricLockEnabled();
      if (cancelled || !enabled) return;

      setLocked(true);
      void promptUnlock();

      const { App } = await import("@capacitor/app");
      const sub = await App.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) {
          lastBackgroundedAt = Date.now();
          return;
        }
        const idleMs = lastBackgroundedAt
          ? Date.now() - lastBackgroundedAt
          : Infinity;
        if (idleMs >= LOCK_AFTER_BACKGROUND_MS) {
          setLocked(true);
          void promptUnlock();
        }
      });
      removeListener = sub.remove;
    })();

    return () => {
      cancelled = true;
      void removeListener?.();
    };
  }, [promptUnlock]);

  if (!locked) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App locked"
      className="bg-background/95 fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 backdrop-blur-md"
    >
      <Fingerprint className="text-primary h-20 w-20" />
      <div className="text-center">
        <h2 className="text-xl font-semibold">Tutly is locked</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Authenticate to continue
        </p>
      </div>
      <Button onClick={() => void promptUnlock()}>Unlock</Button>
      {unlockedAt !== null && (
        <p className="text-muted-foreground text-xs">
          Tap Unlock if the prompt didn&apos;t appear
        </p>
      )}
    </div>
  );
}
