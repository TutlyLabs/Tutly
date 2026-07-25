import type { Role } from "@tutly/db/browser";

import { ROLES, type PermissionRequest } from "./permissions";

/**
 * Synchronous, isomorphic permission check. Grants are static per role, so this
 * runs identically in tRPC middleware, server components and the browser — no
 * round trip, no duplicated policy.
 */
export function hasPermission(
  role: Role | null | undefined,
  request: PermissionRequest,
): boolean {
  if (!role) return false;
  const grantedRole = ROLES[role];
  if (!grantedRole) return false;
  return grantedRole.authorize(request).success;
}

/** True when the role satisfies at least one of the requests. */
export function hasAnyPermission(
  role: Role | null | undefined,
  requests: PermissionRequest[],
): boolean {
  return requests.some((request) => hasPermission(role, request));
}

/** True when the role satisfies every request. */
export function hasAllPermissions(
  role: Role | null | undefined,
  requests: PermissionRequest[],
): boolean {
  return requests.every((request) => hasPermission(role, request));
}
