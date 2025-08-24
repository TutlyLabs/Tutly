import { initTRPC, TRPCError } from "@trpc/server";
import type { NextRequest } from "next/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "@/lib/db";
import { auth } from "@/server/auth";
import { getServerSession } from "@/lib/auth";

/**
 * Session validation for API requests using bearer token
 */
export const getSessionFromRequest = async (req: NextRequest) => {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    // Verify the token using Better Auth
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    return session?.user ? session : null;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
};

/**
 * Context creation for tRPC
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: {
  req?: NextRequest;
  headers?: Headers;
}) => {
  let session = null;
  let source = "unknown";
  let token = null;

  if (opts.req) {
    // API route context
    session = await getSessionFromRequest(opts.req);
    source = opts.req.headers.get("x-trpc-source") ?? "unknown";
    token = opts.req.headers.get("authorization") ?? null;
  } else if (opts.headers) {
    // Server-side context (RSC)
    source = opts.headers.get("x-trpc-source") ?? "unknown";
    token = opts.headers.get("authorization") ?? null;

    // For server-side calls with Bearer tokens, authenticate using Better Auth
    if (token?.startsWith("Bearer ")) {
      try {
        session = await auth.api.getSession({
          headers: opts.headers,
        });
      } catch (error) {
        console.error("Bearer token verification failed:", error);
      }
    } else {
      try {
        const serverSession = await getServerSession();
        if (serverSession?.user) {
          session = {
            user: serverSession.user,
            session: serverSession.session,
          };
        }
      } catch (error) {
        console.error("Server-side session failed:", error);
      }
    }
  }

  console.log(
    ">>> tRPC Request from",
    source,
    "by",
    session?.user?.email ?? "unknown",
  );

  return {
    session,
    db,
    token,
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
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });
