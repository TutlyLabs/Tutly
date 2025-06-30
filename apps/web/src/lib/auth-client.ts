import { createAuthClient } from "better-auth/react";
import { customSessionClient } from "better-auth/client/plugins";
import type { Auth } from "@tutly/api";
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
    customSessionClient<Auth>(),
  ],
});
