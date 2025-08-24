import { createAuthClient } from "better-auth/react";
import { customSessionClient } from "better-auth/client/plugins";
import type { auth } from "@/server/auth";
import {
  adminClient,
  apiKeyClient,
  usernameClient,
} from "better-auth/client/plugins";
import { FRONTEND_URL } from "@/lib/constants";
import { getBearerToken } from "@/lib/auth-utils";

export const authClient = createAuthClient({
  baseURL: FRONTEND_URL,
  plugins: [
    usernameClient(),
    adminClient(),
    apiKeyClient(),
    customSessionClient<typeof auth>(),
  ],
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: () => getBearerToken() || "",
    },
  },
});
