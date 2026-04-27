import pkg from "../../package.json";

/**
 * Latest released native binary version of the app.
 * Bumped each time we cut a Play Store / App Store release.
 * Drives the in-app "Update available" prompt.
 */
export const LATEST_NATIVE_VERSION = "3.6.0";

/**
 * Minimum supported native binary version.
 * If the user is on an older binary, the prompt becomes
 * non-dismissable to force-prevent stale clients from
 * hitting incompatible APIs.
 */
export const MIN_SUPPORTED_NATIVE_VERSION = "3.0.0";

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=in.tutly.app";
export const APP_STORE_URL = "https://apps.apple.com/app/tutly/id0000000000";

export function currentAppVersion(): string {
  return pkg.version;
}

/** Compare semver-ish strings, returns -1 / 0 / +1 like Array.sort. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.\-]/).map((p) => parseInt(p, 10) || 0);
  const pb = b.split(/[.\-]/).map((p) => parseInt(p, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const ai = pa[i] ?? 0;
    const bi = pb[i] ?? 0;
    if (ai > bi) return 1;
    if (ai < bi) return -1;
  }
  return 0;
}
