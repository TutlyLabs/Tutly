import { Capacitor } from "@capacitor/core";

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // "ios" | "android" | "web"
export const isIOS = platform === "ios";
export const isAndroid = platform === "android";
