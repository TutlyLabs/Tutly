import type { Role } from "@tutly/db/browser";
import {
  hasAllPermissions,
  hasAnyPermission,
} from "@tutly/auth/access-control";
import type {
  ActionsOf,
  PermissionRequest,
  Resource,
} from "@tutly/auth/permissions";
import type { SessionUser } from "@tutly/auth/session";

/**
 * Everything a UI gate is allowed to look at. Deliberately narrower than
 * `SessionUser`: a gate that needs another field gets an explicit addition here
 * rather than reaching into the session ad hoc.
 */
export interface PermissionContext {
  role: Role | null;
  /**
   * The `user.isAdmin` column. Not a role and not a grant — see
   * `docs/permissions.md`. Exposed only so the two contradictory legacy
   * readings can be spelled out by name instead of re-derived inline.
   */
  isAdmin: boolean;
  /** Ids of the courses this user is a course-scoped admin of. */
  adminForCourseIds: readonly string[];
}

/** A gate expressed against the shared grant table. */
export interface PermissionCheck {
  /** Every request must be granted. */
  all?: readonly PermissionRequest[];
  /** At least one request must be granted. */
  any?: readonly PermissionRequest[];
  /**
   * No request may be granted. Needed for learner-facing UI that must vanish
   * for staff, which the superset role hierarchy cannot express positively.
   */
  none?: readonly PermissionRequest[];
  /**
   * Additionally require course-scoped admin over this course. `null` or
   * `undefined` asserts no course scope.
   */
  courseId?: string | null;
}

/** The anonymous context: every gate built from it fails closed. */
export const ANONYMOUS_CONTEXT: PermissionContext = {
  role: null,
  isAdmin: false,
  adminForCourseIds: [],
};

export function toPermissionContext(
  user: SessionUser | null | undefined,
): PermissionContext {
  if (!user) return ANONYMOUS_CONTEXT;
  return {
    role: user.role,
    isAdmin: user.isAdmin,
    adminForCourseIds: (user.adminForCourses ?? []).map((course) => course.id),
  };
}

/** Normalises the two call shapes `can`/`useCan`/`canServer` accept. */
export function toCheck<R extends Resource>(
  resourceOrCheck: R | PermissionCheck,
  actions: readonly ActionsOf<R>[],
): PermissionCheck {
  if (typeof resourceOrCheck === "string") {
    return { all: [{ [resourceOrCheck]: actions } as PermissionRequest] };
  }
  return resourceOrCheck;
}

function nonEmpty(
  requests: readonly PermissionRequest[] | undefined,
): requests is readonly PermissionRequest[] {
  return requests !== undefined && requests.length > 0;
}

/**
 * The single decision function every gate in the app funnels through.
 *
 * Fails closed: no session, an unknown role, or a check that asserts nothing
 * all return `false`.
 */
export function can(ctx: PermissionContext, check: PermissionCheck): boolean {
  const { role } = ctx;
  if (!role) return false;

  const courseId = check.courseId ?? null;
  const asserts =
    nonEmpty(check.all) ||
    nonEmpty(check.any) ||
    nonEmpty(check.none) ||
    courseId !== null;
  if (!asserts) return false;

  if (nonEmpty(check.all) && !hasAllPermissions(role, [...check.all])) {
    return false;
  }
  if (nonEmpty(check.any) && !hasAnyPermission(role, [...check.any])) {
    return false;
  }
  if (nonEmpty(check.none) && hasAnyPermission(role, [...check.none])) {
    return false;
  }
  if (courseId !== null && !ctx.adminForCourseIds.includes(courseId)) {
    return false;
  }
  return true;
}

/** Convenience wrapper for the common single resource/actions form. */
export function canDo<R extends Resource>(
  ctx: PermissionContext,
  resource: R,
  ...actions: ActionsOf<R>[]
): boolean {
  return can(ctx, toCheck(resource, actions));
}

/**
 * Course-scoped admin. Not derivable from the static grant table, so it stays
 * an explicit context lookup rather than a faked role check.
 */
export function isCourseAdmin(
  ctx: PermissionContext,
  courseId: string | null | undefined,
): boolean {
  if (!courseId) return false;
  return ctx.adminForCourseIds.includes(courseId);
}

/*
 * `user.isAdmin` has two contradictory meanings in the codebase today. Neither
 * is folded into `can()`; both are named here so a call site has to say which
 * one it means, and so a future cleanup can grep for them.
 */

/**
 * The RESTRICTING reading, used by the UI: an INSTRUCTOR flagged `isAdmin` is
 * treated as a read-only observer and loses write affordances.
 *
 * Preserves the existing `role === "INSTRUCTOR" && !isAdmin` behaviour exactly.
 */
export function canActAsInstructor(ctx: PermissionContext): boolean {
  return ctx.role === "INSTRUCTOR" && !ctx.isAdmin;
}

/**
 * The ESCALATING reading, used by the API: `isAdmin` grants an otherwise
 * ungranted capability (e.g. `testRuns.reapStaleRuns`).
 *
 * UI-only helper. The tRPC procedure is the security boundary; this exists so a
 * button can match what the server will actually accept.
 */
export function canEscalateViaIsAdmin(
  ctx: PermissionContext,
  check: PermissionCheck,
): boolean {
  return ctx.isAdmin || can(ctx, check);
}
