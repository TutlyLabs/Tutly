"use client";

import { Fingerprint } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Switch } from "@tutly/ui/switch";

import {
  authenticateBiometric,
  getBiometricLockEnabled,
  isBiometricAvailable,
  setBiometricLockEnabled,
} from "@/lib/biometric";
import { useIsNative } from "@/hooks/use-native";

export default function BiometricToggle() {
  const native = useIsNative();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!native) return;
    void (async () => {
      const [available, current] = await Promise.all([
        isBiometricAvailable(),
        getBiometricLockEnabled(),
      ]);
      setSupported(available);
      setEnabled(current);
    })();
  }, [native]);

  if (!native || !supported) return null;

  const handleToggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (next) {
        const ok = await authenticateBiometric("Enable biometric lock");
        if (!ok) {
          toast.error("Biometric authentication failed");
          return;
        }
      }
      await setBiometricLockEnabled(next);
      setEnabled(next);
      toast.success(next ? "Biometric lock enabled" : "Biometric lock disabled");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm">
      <div className="flex items-center gap-2">
        <Fingerprint className="h-5 w-5" />
        <span>Biometric lock</span>
      </div>
      <Switch
        checked={enabled}
        disabled={busy}
        onCheckedChange={(v) => void handleToggle(v)}
      />
    </div>
  );
}
