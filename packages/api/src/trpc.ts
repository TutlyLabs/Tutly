import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

import { hasPermission } from "@tutly/auth/access-control";
import type {
  ActionsOf,
  PermissionRequest,
  Resource,
} from "@tutly/auth/permissions";
import type { SessionUser, SessionWithUser } from "@tutly/auth/session";
import { db, type Db } from "@tutly/db";
import { createLogger } from "@tutly/logger";

const logger = createLogger("api:trpc");

export interface SessionContext {
  user: SessionUser | null;
  session: SessionWithUser["session"] | null;
}

export interface TRPCContext {
  db: Db;
  session: SessionContext | null;
  token: string | null;
  source: string;
  headers: Headers;
}

/** Session narrowed to an authenticated user, as seen inside protected procedures. */
export interface AuthedSessionContext extends SessionContext {
  user: SessionUser;
}

export const createTRPCContext = async (opts: {
  headers: Headers;
  session: SessionContext | null;
}): Promise<TRPCContext> => {
  const source = opts.headers.get("x-trpc-source") ?? "unknown";
  const token = opts.headers.get("authorization") ?? null;

  logger.debug(
    { source, userId: opts.session?.user?.id ?? null },
    "trpc request received",
  );

  return {
    session: opts.session,
    db,
    token,
    source,
    headers: opts.headers,
  };
};

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();
  const result = await next();
  logger.info(
    { path, durationMs: Date.now() - start },
    "trpc request completed",
  );
  return result;
});

/**
 * Errors used to vanish outside development because only the Next.js route
 * handler logged them. Logs path, code and the caller's user id — never the
 * email, token, input or message, any of which can carry user data.
 */
const errorLoggingMiddleware = t.middleware(async ({ next, path, ctx }) => {
  const result = await next();
  if (!result.ok) {
    logger.error(
      {
        path,
        code: result.error.code,
        userId: ctx.session?.user?.id ?? "anonymous",
      },
      "trpc request failed",
    );
  }
  return result;
});

const baseProcedure = t.procedure
  .use(errorLoggingMiddleware)
  .use(timingMiddleware);

export const publicProcedure = baseProcedure;

export const protectedProcedure = baseProcedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

const STAFF_ROLES = new Set(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"]);

/** Course-staff gate: INSTRUCTOR, ADMIN or SUPER_ADMIN. */
export const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!STAFF_ROLES.has(ctx.session.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Staff access required" });
  }
  return next();
});

/** Everyone above STUDENT — staff plus mentors. */
export const mentorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role === "STUDENT") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Mentor access required",
    });
  }
  return next();
});

export const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "SUPER_ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Super admin access required",
    });
  }
  return next();
});

/**
 * Gates a procedure on a single static role grant from `@tutly/auth`. The
 * resource/action pair is checked at compile time, so an action that does not
 * exist on that resource fails typecheck rather than silently passing.
 *
 * Static grants are role-wide: anything scoped to a course, enrolment or record
 * still needs a runtime check from `./lib/authorization`.
 */
export function permissionProcedure<R extends Resource>(
  resource: R,
  action: ActionsOf<R>,
) {
  const request = { [resource]: [action] } as PermissionRequest;
  return protectedProcedure.use(({ ctx, next }) => {
    if (!hasPermission(ctx.session.user.role, request)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action",
      });
    }
    return next();
  });
}
