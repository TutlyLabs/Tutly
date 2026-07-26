"use client";

import { useMemo } from "react";

import type { ActionsOf, Resource } from "@tutly/auth/permissions";
import type { SessionUser } from "@tutly/auth/session";

import { useClientSession } from "@/lib/auth/client";

import type { PermissionCheck, PermissionContext } from "./core";
import { can, isCourseAdmin, toCheck, toPermissionContext } from "./core";

/**
 * The current user's permission context.
 *
 * Fails closed while the session is still loading, so a gated control never
 * flashes visible before the session resolves.
 */
export function usePermissionContext(): PermissionContext {
  const { data } = useClientSession();
  const user = (data?.user ?? null) as SessionUser | null;
  return useMemo(() => toPermissionContext(user), [user]);
}

/**
 * `useCan("course", "update")` or `useCan({ any: [...] })`. Actions are typed
 * against the resource, so `useCan("course", "nonsense")` will not compile.
 */
export function useCan<R extends Resource>(
  resourceOrCheck: R | PermissionCheck,
  ...actions: ActionsOf<R>[]
): boolean {
  const ctx = usePermissionContext();
  return can(ctx, toCheck(resourceOrCheck, actions));
}

/** True when at least one check passes. */
export function useCanAny(checks: readonly PermissionCheck[]): boolean {
  const ctx = usePermissionContext();
  return checks.some((check) => can(ctx, check));
}

/** True when every check passes. An empty list denies. */
export function useCanAll(checks: readonly PermissionCheck[]): boolean {
  const ctx = usePermissionContext();
  return checks.length > 0 && checks.every((check) => can(ctx, check));
}

/** Course-scoped admin, which no static role grant can express. */
export function useIsCourseAdmin(courseId: string | null | undefined): boolean {
  const ctx = usePermissionContext();
  return isCourseAdmin(ctx, courseId);
}

interface CanBaseProps {
  children: React.ReactNode;
  /** Rendered instead of `children` when the gate denies. Defaults to nothing. */
  fallback?: React.ReactNode;
}

/**
 * Exactly one of the four gate shapes must be supplied. `resource`/`action` is
 * the common case; `check` unlocks `none` and `courseId`.
 */
export type CanProps<R extends Resource> = CanBaseProps &
  (
    | {
        resource: R;
        action: ActionsOf<R>;
        check?: never;
        any?: never;
        all?: never;
      }
    | {
        resource?: never;
        action?: never;
        check: PermissionCheck;
        any?: never;
        all?: never;
      }
    | {
        resource?: never;
        action?: never;
        check?: never;
        any: readonly PermissionCheck[];
        all?: never;
      }
    | {
        resource?: never;
        action?: never;
        check?: never;
        any?: never;
        all: readonly PermissionCheck[];
      }
  );

/**
 * Renders `children` only when the permission holds. Hiding a control is UX,
 * never a security boundary — the tRPC procedure must enforce the same rule.
 */
export function Can<R extends Resource>(props: CanProps<R>): React.ReactNode {
  const ctx = usePermissionContext();
  const { children, fallback = null } = props;

  let allowed: boolean;
  if (props.any) {
    allowed = props.any.some((check) => can(ctx, check));
  } else if (props.all) {
    allowed = props.all.length > 0 && props.all.every((c) => can(ctx, c));
  } else if (props.check) {
    allowed = can(ctx, props.check);
  } else {
    allowed = can(ctx, toCheck(props.resource, [props.action]));
  }

  return allowed ? children : fallback;
}

/** Alias — some call sites read better as an explicit gate. */
export const PermissionGate = Can;

export type { PermissionCheck, PermissionContext };
