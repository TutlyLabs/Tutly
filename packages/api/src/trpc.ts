import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { db, type Db } from "@tutly/db";

export interface SessionContext {
  user: any | null;
  session: any;
}

export interface TRPCContext {
  db: Db;
  session: SessionContext | null;
  token: string | null;
  source: string;
}

export const createTRPCContext = async (opts: {
  headers: Headers;
  session: SessionContext | null;
}): Promise<TRPCContext> => {
  const source = opts.headers.get("x-trpc-source") ?? "unknown";
  const token = opts.headers.get("authorization") ?? null;

  console.log(
    ">>> tRPC Request from",
    source,
    "by",
    opts.session?.user?.email ?? "unknown",
  );

  return {
    session: opts.session,
    db,
    token,
    source,
  };
};

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
    },
  }),
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();
  if (t._config.isDev) {
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  const result = await next();
  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);
  return result;
});

export const publicProcedure = t.procedure.use(timingMiddleware);

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
