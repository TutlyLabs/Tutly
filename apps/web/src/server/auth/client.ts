import { createAuthClient } from "better-auth/react";
import {
  customSessionClient,
  inferAdditionalFields,
  usernameClient,
} from "better-auth/client/plugins";
import type { auth } from "@/server/auth";
import { getPreviewUrl } from "@/lib/constants";
import { nextCookies } from "better-auth/next-js";

export const authClient = createAuthClient({
  baseURL: getPreviewUrl(),
  plugins: [
    nextCookies(),
    customSessionClient<typeof auth>(),
    inferAdditionalFields<typeof auth>(),
    usernameClient(),
  ],
});
