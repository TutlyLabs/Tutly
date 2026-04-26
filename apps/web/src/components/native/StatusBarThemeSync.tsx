"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

import { isAndroid, isNative } from "@/lib/native";

export default function StatusBarThemeSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!isNative()) return;

    let cancelled = false;
    void (async () => {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      if (cancelled) return;

      const dark = resolvedTheme === "dark";
      // Style.Dark = dark icons on light bg; Style.Light = light icons on dark bg.
      await StatusBar.setStyle({ style: dark ? Style.Light : Style.Dark });
      if (isAndroid()) {
        await StatusBar.setBackgroundColor({
          color: dark ? "#000000" : "#ffffff",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resolvedTheme]);

  return null;
}
