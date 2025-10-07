import * as SecureStore from "expo-secure-store";
import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";

import { getBaseUrl } from "./base-url";

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [
    expoClient({
      scheme: "expo",
      storagePrefix: "expo",
      storage: SecureStore,
    }),
  ],
});

export const getAuthToken = async (): Promise<string | null> => {
  try {
    const session = await authClient.getSession();
    if (session?.data?.session?.token) {
      return session.data.session.token;
    }
    return null;
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return null;
  }
};
