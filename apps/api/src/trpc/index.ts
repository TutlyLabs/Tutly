import { initTRPC, TRPCError } from '@trpc/server';
import type * as trpcExpress from '@trpc/server/adapters/express';
import superjson from 'superjson';
import { ZodError } from 'zod';

import { db } from '../lib/db';
import { auth } from '../utils/auth';

/**
 * Session validation for API requests
 */
export const getSessionFromRequest = async (req: trpcExpress.CreateExpressContextOptions['req']) => {
  // Convert Node.js headers to a Headers instance for Better Auth
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      headers.set(key, value.join(', '));
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }
  const session = await auth.api.getSession({ headers });
  return session?.user ? session : null;
};

/**
 * Context creation for tRPC
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: trpcExpress.CreateExpressContextOptions) => {
  const session = await getSessionFromRequest(opts.req);
  const source = opts.req.headers['x-trpc-source'] ?? 'unknown';
  console.log('>>> tRPC Request from', source, 'by', session?.user.email);

  return {
    session,
    db,
    token: opts.req.headers.authorization ?? null,
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
export const protectedProcedure = t.procedure.use(timingMiddleware).use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});
