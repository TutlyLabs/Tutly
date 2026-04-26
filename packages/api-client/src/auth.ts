export interface BearerStorage {
  /** Synchronous read; mobile callers should mirror their async store into memory at boot. */
  getToken: () => string | null;
  setToken: (value: string) => void | Promise<void>;
  removeToken?: () => void | Promise<void>;
}

/**
 * Better Auth `fetchOptions` that captures the bearer token from `set-auth-token`
 * response headers and replays it on subsequent requests. Storage is pluggable so
 * web can pass localStorage and mobile can pass a Capacitor Preferences adapter.
 */
export function createBearerFetchOptions(storage: BearerStorage) {
  return {
    onSuccess: async (ctx: { response: Response }) => {
      const authToken = ctx.response.headers.get("set-auth-token");
      if (authToken) await storage.setToken(authToken);
    },
    auth: {
      type: "Bearer" as const,
      token: () => storage.getToken() ?? "",
    },
  };
}

export const TUTLY_BEARER_TOKEN_KEY = "bearer_token";

/** localStorage adapter for browser callers. SSR-safe (returns null off-window). */
export const localStorageBearerStorage: BearerStorage = {
  getToken: () => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TUTLY_BEARER_TOKEN_KEY);
  },
  setToken: (value) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TUTLY_BEARER_TOKEN_KEY, value);
  },
  removeToken: () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TUTLY_BEARER_TOKEN_KEY);
  },
};
