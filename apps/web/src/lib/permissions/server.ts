import "server-only";

import { redirect } from "next/navigation";

import type { ActionsOf, Resource } from "@tutly/auth/permissions";
import type { SessionWithUser } from "@tutly/auth/session";

import { getServerSession } from "@/lib/auth";

import type { PermissionCheck, PermissionContext } from "./core";
import { can, isCourseAdmin, toCheck, toPermissionContext } from "./core";

/** The permission context of the request's session, or the anonymous one. */
export async function getPermissionContext(): Promise<PermissionContext> {
  const session = await getServerSession();
  return toPermissionContext(session?.user);
}

/**
 * `canServer("course", "update")` or `canServer({ any: [...] })`. Actions are
 * typed against the resource, so a bogus action will not compile.
 */
export async function canServer<R extends Resource>(
  resourceOrCheck: R | PermissionCheck,
  ...actions: ActionsOf<R>[]
): Promise<boolean> {
  const ctx = await getPermissionContext();
  return can(ctx, toCheck(resourceOrCheck, actions));
}

/** Course-scoped admin for the current request. */
export async function isCourseAdminServer(
  courseId: string | null | undefined,
): Promise<boolean> {
  const ctx = await getPermissionContext();
  return isCourseAdmin(ctx, courseId);
}

export interface RequirePermissionOptions {
  /** Where to send a denied user. Anonymous users always go to sign-in. */
  redirectTo?: string;
}

/**
 * Route guard for server components and layouts. Redirects rather than
 * rendering a shell the user cannot use, and returns the session so the caller
 * does not fetch it twice.
 *
 * This is a UX guard. The tRPC procedure behind the page still enforces the
 * same permission.
 */
export async function requirePermission(
  check: PermissionCheck,
  options: RequirePermissionOptions = {},
): Promise<SessionWithUser> {
  const session = await getServerSession();
  if (!session?.user) redirect("/sign-in");

  if (!can(toPermissionContext(session.user), check)) {
    redirect(options.redirectTo ?? "/dashboard");
  }
  return session;
}
