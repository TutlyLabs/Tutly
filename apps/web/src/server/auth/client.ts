import { createAuthClient } from "better-auth/react";
import {
  customSessionClient,
  inferAdditionalFields,
  usernameClient,
  adminClient,
} from "better-auth/client/plugins";
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
  fetchOptions: {
    onSuccess: (ctx) => {
      const authToken = ctx.response.headers.get("set-auth-token");
      if (authToken && typeof window !== "undefined") {
        localStorage.setItem("bearer_token", authToken);
      }
    },
    auth: {
      type: "Bearer",
      token: () => {
        if (typeof window !== "undefined") {
          return localStorage.getItem("bearer_token") || "";
        }
        return "";
      },
    },
  },
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
