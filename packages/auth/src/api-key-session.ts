import type { Session } from "better-auth";

import type { Db } from "@tutly/db";

import type { ServerAuth } from "./server";
import type { SessionWithUser } from "./session";
import { enrichSession } from "./enrich-session";
import { API_KEY_PREFIX } from "./server";

/** How a request authenticated. Recorded for auditing. */
export type AuthMethod = "session" | "api-key";

export interface ResolvedSession {
  user: SessionWithUser["user"] | null;
  session: SessionWithUser["session"] | null;
  authMethod: AuthMethod;
}

const ANONYMOUS: ResolvedSession = {
  user: null,
  session: null,
  authMethod: "session",
};

/**
 * Bearer tokens are only treated as keys when they carry the Tutly prefix;
 * otherwise a real session token would be misread as a key.
 */
export function extractApiKey(headers: Headers): string | null {
  const direct = headers.get("x-api-key");
  if (direct) return direct;

  const authorization = headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer?.startsWith(API_KEY_PREFIX)) return bearer;

  return null;
}

export interface ResolveSessionOptions {
  auth: ServerAuth;
  db: Db;
  headers: Headers;
  onError?: (error: unknown) => void;
}

/**
 * Resolves a cookie, bearer token or API key to an enriched session. The
 * interactive path is tried first so browsers never pay for key verification.
 *
 * Keys are handled here rather than via `enableSessionForAPIKeys`, which
 * bypasses `customSession`; see `server.ts`.
 */
export async function resolveSession({
  auth,
  db,
  headers,
  onError,
}: ResolveSessionOptions): Promise<ResolvedSession> {
  const sessionResult = await auth.api
    .getSession({ headers })
    .catch((error: unknown) => {
      onError?.(error);
      return null;
    });

  if (sessionResult?.user) {
    return {
      user: sessionResult.user as SessionWithUser["user"],
      session: sessionResult.session,
      authMethod: "session",
    };
  }

  const key = extractApiKey(headers);
  if (!key) return ANONYMOUS;

  const verified = await auth.api
    .verifyApiKey({ body: { key } })
    .catch((error: unknown) => {
      onError?.(error);
      return null;
    });

  if (!verified?.valid || !verified.key) return ANONYMOUS;

  const apiKeyRecord = verified.key;
  const user = await db.user.findUnique({ where: { id: apiKeyRecord.userId } });
  if (!user) return ANONYMOUS;

  // `token` holds the key's id, never the plaintext, so a logged context
  // cannot be replayed.
  const syntheticSession: Session = {
    id: apiKeyRecord.id,
    token: apiKeyRecord.id,
    userId: apiKeyRecord.userId,
    createdAt: apiKeyRecord.createdAt,
    updatedAt: apiKeyRecord.updatedAt,
    expiresAt:
      apiKeyRecord.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
    ipAddress: headers.get("x-real-ip") ?? headers.get("x-forwarded-for"),
    userAgent: headers.get("user-agent"),
  };

  const enriched = await enrichSession({
    db,
    // Only `id` is read; the rest is re-read from Prisma.
    user: { id: user.id } as Parameters<typeof enrichSession>[0]["user"],
    session: syntheticSession,
    touchLastSeen: false,
    onError,
  });

  if (!enriched.user) return ANONYMOUS;

  return {
    user: enriched.user,
    session: enriched.session,
    authMethod: "api-key",
  };
}
