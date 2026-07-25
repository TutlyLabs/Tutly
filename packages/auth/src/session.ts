import type { User as AuthUser, Session } from "better-auth";

import type { Course, Organization, Role, User } from "@tutly/db/browser";

/**
 * Shape produced by the `customSession` handler: the Prisma user enriched with
 * the relations every authorization decision needs, minus the secret columns.
 */
export type SessionUser = Omit<User, "oneTimePassword"> & {
  role: Role;
  organization: Organization | null;
  adminForCourses: Course[];
};

export type SessionWithUser = {
  user: SessionUser;
  session: Session;
};

/** A session that better-auth has resolved but may be anonymous. */
export type MaybeSession = SessionWithUser | null;

/** What better-auth hands the `customSession` handler before enrichment. */
export type CustomSessionInput = {
  user: AuthUser;
  session: Session;
};

/**
 * The enriched session, or the anonymous shape when the account is disabled.
 * Deliberately narrow: better-auth infers the client-side session type from it,
 * so widening it here degrades `useSession()` everywhere.
 */
export type CustomSessionResult =
  | SessionWithUser
  | { user: null; session: null };
