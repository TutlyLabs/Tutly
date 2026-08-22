import type { Db } from "@tutly/db";

import { createServerAuth } from "./src/server";

/**
 * Config entry point for `@better-auth/cli`, which loads a plain TS module and
 * cannot resolve the web app's `@/*` path aliases or its React email imports.
 *
 * It reuses `createServerAuth` so the plugin list — and therefore the generated
 * schema — stays single-sourced in `src/server.ts`. Every option here is a stub:
 * the CLI only reads `auth.options` to derive tables, and never opens a
 * connection or serves a request.
 *
 *   pnpm --filter @tutly/auth db:generate-schema
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
