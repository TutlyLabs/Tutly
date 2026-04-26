import { Capacitor } from "@capacitor/core";

export type Platform = "web" | "ios" | "android";

export const isCapacitorBuild =
  process.env.NEXT_PUBLIC_BUILD_TARGET === "capacitor";

export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}

export function getPlatform(): Platform {
  if (typeof window === "undefined") return "web";
  return Capacitor.getPlatform() as Platform;
}

export function isIOS(): boolean {
  return getPlatform() === "ios";
}

export function isAndroid(): boolean {
  return getPlatform() === "android";
}
