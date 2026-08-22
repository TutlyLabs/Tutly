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
  /** Off for API keys, so background polling does not fake presence. */
  touchLastSeen?: boolean;
  onError?: (error: unknown) => void;
}

const LAST_SEEN_THRESHOLD_MS = 60 * 1000;

/**
 * Enriches a better-auth user into the `SessionUser` that authorization reads.
 *
 * Shared by both session paths. Cookie/bearer sessions get this via
 * `customSession`; API keys bypass that plugin, and a session without `role` or
 * `adminForCourses` makes `isCourseAdmin` throw rather than deny.
 */
export async function enrichSession({
  db,
  user,
  session,
  touchLastSeen = true,
  onError,
}: EnrichSessionOptions): Promise<CustomSessionResult> {
  // Unenriched: role-gated procedures fail closed.
  const passThrough = () => ({ user, session }) as unknown as SessionWithUser;

  try {
    const prismaUser = await db.user.findUnique({
      where: { id: user.id },
      include: { organization: true, adminForCourses: true },
    });
    if (!prismaUser) return passThrough();

    // Disabled accounts lose every session, not just this request.
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

    // A live credential: delete it so the key is absent, not undefined.
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
