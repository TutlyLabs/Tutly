import { Preferences } from "@capacitor/preferences";

import {
  type BearerStorage,
  TUTLY_BEARER_TOKEN_KEY,
} from "@tutly/api-client";

/**
 * Capacitor Preferences is async; better-auth's bearer token() callback is sync.
 * We keep an in-memory mirror that is hydrated on app boot and updated on
 * every successful auth response.
 */
let cachedToken: string | null = null;

export async function hydrateBearerCache(): Promise<void> {
  const { value } = await Preferences.get({ key: TUTLY_BEARER_TOKEN_KEY });
  cachedToken = value;
}

export const nativeBearerStorage: BearerStorage = {
  getToken: () => cachedToken,
  setToken: async (value: string) => {
    cachedToken = value;
    await Preferences.set({ key: TUTLY_BEARER_TOKEN_KEY, value });
  },
  removeToken: async () => {
    cachedToken = null;
    await Preferences.remove({ key: TUTLY_BEARER_TOKEN_KEY });
  },
};
