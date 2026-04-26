import { createAuthClient } from "better-auth/react";
import {
  customSessionClient,
  inferAdditionalFields,
  usernameClient,
  adminClient,
} from "better-auth/client/plugins";
import {
  createBearerFetchOptions,
  localStorageBearerStorage,
} from "@tutly/api-client";
import { ac, ROLES } from "@tutly/auth/client";

import type { auth } from "@/server/auth";
import { getPreviewUrl } from "@/lib/constants";

export const authClient = createAuthClient({
  baseURL: getPreviewUrl(),
  fetchOptions: createBearerFetchOptions(localStorageBearerStorage),
  plugins: [
    customSessionClient<typeof auth>(),
    inferAdditionalFields<typeof auth>(),
    usernameClient(),
    adminClient({ ac, roles: ROLES }),
  ],
});
