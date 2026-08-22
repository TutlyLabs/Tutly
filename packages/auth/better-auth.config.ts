import type { Db } from "@tutly/db";

import { createServerAuth } from "./src/server";

/**
 * Entry point for `@better-auth/cli`, which cannot resolve the web app's `@/*`
 * aliases. Reuses `createServerAuth` so the plugin list stays single-sourced.
 *
 * Options are stubs: the CLI only reads `auth.options` to derive tables.
 *
 *   pnpm --filter @tutly/auth auth:generate-schema
 */
export const auth = createServerAuth({
  secret: "better-auth-cli-schema-generation",
  baseURL: "http://localhost:3000",
  db: {} as Db,
  useSecureCookies: false,
  password: {
    hash: () => Promise.resolve(""),
    verify: () => Promise.resolve(false),
  },
  sendResetPassword: () => Promise.resolve(),
  customSessionHandler: () => Promise.resolve({ user: null, session: null }),
});
