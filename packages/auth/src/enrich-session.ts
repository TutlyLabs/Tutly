import type { User as AuthUser, Session } from "better-auth";

import type { Db } from "@tutly/db";

import type {
  CustomSessionResult,
  SessionUser,
  SessionWithUser,
} from "./session";

export interface EnrichSessionOptions {
  db: Db;
  user: AuthUser;
  session: Session;
  /**
   * Bump `User.lastSeen`. Off for API keys, where a background agent polling
   * would otherwise make a user look permanently online.
   */
  touchLastSeen?: boolean;
  onError?: (error: unknown) => void;
}

const LAST_SEEN_THRESHOLD_MS = 60 * 1000;

/**
 * Turns a bare better-auth user into the enriched `SessionUser` that every
 * authorization check in `@tutly/api` reads.
 *
 * Shared because only one of the two session paths runs through better-auth's
 * `customSession` plugin: cookie/bearer sessions hit `/get-session`, which the
 * plugin overrides, while API keys are verified directly against the `apikey`
 * table. A key session missing these fields is worse than degraded —
 * `permissionProcedure` fails closed on an undefined `role`, but
 * `isCourseAdmin` reads `user.adminForCourses.some(...)` and throws.
 */
export async function enrichSession({
  db,
  user,
  session,
  touchLastSeen = true,
  onError,
}: EnrichSessionOptions): Promise<CustomSessionResult> {
  // The better-auth user lacks the enriched columns, so role-gated procedures
  // fail closed.
  const passThrough = () => ({ user, session }) as unknown as SessionWithUser;

  try {
    const prismaUser = await db.user.findUnique({
      where: { id: user.id },
      include: { organization: true, adminForCourses: true },
    });
    if (!prismaUser) return passThrough();

    // A disabled account loses every live session, not just this request.
    if (prismaUser.disabledAt) {
      await db.session.deleteMany({ where: { userId: user.id } });
      return { session: null, user: null };
    }

    if (touchLastSeen) {
      const now = new Date();
      if (
        !prismaUser.lastSeen ||
        now.getTime() - prismaUser.lastSeen.getTime() > LAST_SEEN_THRESHOLD_MS
      ) {
        void db.user
          .update({ where: { id: user.id }, data: { lastSeen: now } })
          .catch((error: unknown) => onError?.(error));
      }
    }

    // `oneTimePassword` is a live credential. `SessionUser` omits it by type;
    // deleting it means the key is absent from the object too, rather than
    // present-but-undefined.
    const safeUser: SessionUser & { oneTimePassword?: string } = {
      ...prismaUser,
    };
    delete safeUser.oneTimePassword;

    return { user: safeUser, session };
  } catch (error) {
    onError?.(error);
    return passThrough();
  }
}
