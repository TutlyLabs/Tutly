import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "@tutly/db/client";

import type { SessionWithUser } from "../lib/auth";
import { validateSessionToken } from "../lib/auth";

/**
 * Session validation for API requests
 */
const getSessionFromHeaders = async (headers: Headers) => {
  // Check for Authorization header first
  const authToken = headers.get("Authorization") ?? null;
  if (authToken) {
    const result = await validateSessionToken(authToken);
    return result.session;
  }

  // Then check for cookie
  const cookieHeader = headers.get("cookie");
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split("; ").map((c) => {
        const [key, value] = c.split("=");
        return [key, value];
      }),
    );
    const sessionId = cookies.tutly_session;
    if (sessionId) {
      const result = await validateSessionToken(sessionId);
      return result.session;
    }
  }

  return null;
};

/**
 * Context creation for tRPC
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: {
  headers: Headers;
  session: SessionWithUser | null;
}) => {
  const session = await getSessionFromHeaders(opts.headers);
  const source = opts.headers.get("x-trpc-source") ?? "unknown";
  console.log(">>> tRPC Request from", source, "by", session?.user);

  return {
    session,
    db,
    token: opts.headers.get("Authorization") ?? null,
  };
};

/**
 * tRPC initialization
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
    },
  }),
});

/**
 * Server-side caller
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * Router creator for tRPC
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Timing middleware with artificial delay in development
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev 100-500ms
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public procedure - available to unauthenticated users
 * @see https://trpc.io/docs/procedures
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected procedure - requires authenticated user
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user.organization) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });
