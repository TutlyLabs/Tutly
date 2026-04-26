import { createAuthClient } from "better-auth/react";
import {
  customSessionClient,
  inferAdditionalFields,
  usernameClient,
  adminClient,
} from "better-auth/client/plugins";
import { ac, ROLES } from "@tutly/auth/client";

import type { auth } from "@/server/auth";
import { getPreviewUrl } from "@/lib/constants";

const BEARER_TOKEN_KEY = "bearer_token";

export const authClient = createAuthClient({
  baseURL: getPreviewUrl(),
  fetchOptions: {
    onSuccess: async (ctx: { response: Response }) => {
      const t = ctx.response.headers.get("set-auth-token");
      if (t && typeof window !== "undefined") {
        window.localStorage.setItem(BEARER_TOKEN_KEY, t);
      }
    },
    auth: {
      type: "Bearer" as const,
      token: () =>
        typeof window === "undefined"
          ? ""
          : (window.localStorage.getItem(BEARER_TOKEN_KEY) ?? ""),
    },
  },
  plugins: [
    customSessionClient<typeof auth>(),
    inferAdditionalFields<typeof auth>(),
    usernameClient(),
    adminClient({ ac, roles: ROLES }),
  ],
});
