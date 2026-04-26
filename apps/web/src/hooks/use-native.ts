"use client";

import { useEffect, useState } from "react";

import { getPlatform, isNative, type Platform } from "@/lib/native";

export function useIsNative(): boolean {
  const [native, setNative] = useState(false);
  useEffect(() => {
    setNative(isNative());
  }, []);
  return native;
}

export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>("web");
  useEffect(() => {
    setPlatform(getPlatform());
  }, []);
  return platform;
}
