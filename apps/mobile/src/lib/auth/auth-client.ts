import * as SecureStore from "expo-secure-store";
import { expoClient } from "@better-auth/expo/client";
import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { env } from "~/lib/env";
import {
  getStoredBearerToken,
  storeBearerTokenFromResponse,
} from "./secure-store";

export const authClient = createAuthClient({
  baseURL: env.apiUrl,
  fetchOptions: {
    headers: {
      origin: env.webUrl,
      referer: `${env.webUrl}/`,
    },
    onSuccess: async (ctx) => {
      await storeBearerTokenFromResponse(ctx.response);
    },
    auth: {
      type: "Bearer",
      token: async () => (await getStoredBearerToken()) || "",
    },
  },
  plugins: [
    usernameClient(),
    expoClient({
      storage: SecureStore,
      scheme: env.scheme,
    }),
  ],
});
