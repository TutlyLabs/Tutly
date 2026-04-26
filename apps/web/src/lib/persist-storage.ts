import { isNative } from "@/lib/native";

type CapacitorAsyncStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const memoryFallback = new Map<string, string>();

export const capacitorAsyncStorage: CapacitorAsyncStorage = {
  async getItem(key) {
    if (!isNative()) return memoryFallback.get(key) ?? null;
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key });
    return value;
  },
  async setItem(key, value) {
    if (!isNative()) {
      memoryFallback.set(key, value);
      return;
    }
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key, value });
  },
  async removeItem(key) {
    if (!isNative()) {
      memoryFallback.delete(key);
      return;
    }
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.remove({ key });
  },
};
