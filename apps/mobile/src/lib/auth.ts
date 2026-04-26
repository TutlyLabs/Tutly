import { createAuthClient } from "better-auth/react";
import {
  customSessionClient,
  inferAdditionalFields,
  usernameClient,
  adminClient,
} from "better-auth/client/plugins";
import { createBearerFetchOptions } from "@tutly/api-client";
import { ac, ROLES } from "@tutly/auth/client";

import { nativeBearerStorage } from "@/native/storage";
import { API_BASE_URL } from "@/lib/env";

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  fetchOptions: createBearerFetchOptions(nativeBearerStorage),
  plugins: [
    customSessionClient(),
    inferAdditionalFields(),
    usernameClient(),
    adminClient({ ac, roles: ROLES }),
  ],
});

export type AuthClient = typeof authClient;
