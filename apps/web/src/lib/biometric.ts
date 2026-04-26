import { isNative } from "@/lib/native";

const PREF_KEY = "tutly:biometric-lock";

export async function isBiometricAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { BiometricAuth } = await import(
      "@aparajita/capacitor-biometric-auth"
    );
    const res = await BiometricAuth.checkBiometry();
    return res.isAvailable;
  } catch {
    return false;
  }
}

export async function authenticateBiometric(reason: string): Promise<boolean> {
  if (!isNative()) return true;
  try {
    const { BiometricAuth } = await import(
      "@aparajita/capacitor-biometric-auth"
    );
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: "Cancel",
      allowDeviceCredential: true,
      iosFallbackTitle: "Use Passcode",
      androidTitle: "Tutly",
      androidSubtitle: reason,
      androidConfirmationRequired: false,
    });
    return true;
  } catch {
    return false;
  }
}

export async function getBiometricLockEnabled(): Promise<boolean> {
  if (!isNative()) return false;
  const { Preferences } = await import("@capacitor/preferences");
  const { value } = await Preferences.get({ key: PREF_KEY });
  return value === "1";
}

export async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
  if (!isNative()) return;
  const { Preferences } = await import("@capacitor/preferences");
  if (enabled) await Preferences.set({ key: PREF_KEY, value: "1" });
  else await Preferences.remove({ key: PREF_KEY });
}
