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
import type { auth } from "@/server/auth";
import { getPreviewUrl } from "@/lib/constants";
import {
  ac,
  adminRole,
  instructorRole,
  mentorRole,
  studentRole,
} from "./permissions";

export const authClient = createAuthClient({
  baseURL: getPreviewUrl(),
  fetchOptions: createBearerFetchOptions(localStorageBearerStorage),
  plugins: [
    customSessionClient<typeof auth>(),
    inferAdditionalFields<typeof auth>(),
    usernameClient(),
    adminClient({
      ac,
      roles: {
        ADMIN: adminRole,
        INSTRUCTOR: instructorRole,
        MENTOR: mentorRole,
        STUDENT: studentRole,
        SUPER_ADMIN: adminRole,
      },
    }),
  ],
});
