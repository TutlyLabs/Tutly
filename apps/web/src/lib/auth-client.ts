import { createAuthClient } from "better-auth/react";
import { customSessionClient } from "better-auth/client/plugins";
import type { auth } from "../../backend/src/utils/auth";
import {
  adminClient,
  apiKeyClient,
  usernameClient,
} from "better-auth/client/plugins";
import { BACKEND_URL } from "./constants";

export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
  plugins: [
    usernameClient(),
    adminClient(),
    apiKeyClient(),
    customSessionClient<typeof auth>(),
  ],
});
