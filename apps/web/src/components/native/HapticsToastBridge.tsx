"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { haptics } from "@/lib/haptics";
import { isNative } from "@/lib/native";

export default function HapticsToastBridge() {
  useEffect(() => {
    if (!isNative()) return;

    const original = {
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
    };

    toast.success = ((...args: Parameters<typeof original.success>) => {
      void haptics.notify("success");
      return original.success(...args);
    }) as typeof toast.success;

    toast.error = ((...args: Parameters<typeof original.error>) => {
      void haptics.notify("error");
      return original.error(...args);
    }) as typeof toast.error;

    toast.warning = ((...args: Parameters<typeof original.warning>) => {
      void haptics.notify("warning");
      return original.warning(...args);
    }) as typeof toast.warning;

    return () => {
      toast.success = original.success;
      toast.error = original.error;
      toast.warning = original.warning;
    };
  }, []);

  return null;
}
