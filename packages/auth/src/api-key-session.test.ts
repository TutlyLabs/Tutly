import { describe, expect, it, vi } from "vitest";

import type { Db } from "@tutly/db";

import type { ServerAuth } from "./server";
import { extractApiKey, resolveSession } from "./api-key-session";
import { API_KEY_PREFIX } from "./server";

const KEY = `${API_KEY_PREFIX}abcdef0123456789`;

function headers(init: Record<string, string>) {
  return new Headers(init);
}

describe("extractApiKey", () => {
  it("reads the x-api-key header", () => {
    expect(extractApiKey(headers({ "x-api-key": KEY }))).toBe(KEY);
  });

  it("reads a prefixed Authorization bearer token", () => {
    expect(extractApiKey(headers({ authorization: `Bearer ${KEY}` }))).toBe(
      KEY,
    );
  });

  it("is case-insensitive on the Bearer scheme", () => {
    expect(extractApiKey(headers({ authorization: `bearer ${KEY}` }))).toBe(
      KEY,
    );
  });

  // Session bearer tokens arrive in the same header; misreading one as a key
  // would make a valid session look invalid.
  it("ignores a bearer token without the Tutly key prefix", () => {
    expect(
      extractApiKey(headers({ authorization: "Bearer some-session-token" })),
    ).toBeNull();
  });

  it("returns null when neither header is present", () => {
    expect(extractApiKey(headers({}))).toBeNull();
  });

  it("prefers x-api-key over Authorization", () => {
    expect(
      extractApiKey(
        headers({ "x-api-key": KEY, authorization: "Bearer other" }),
      ),
    ).toBe(KEY);
  });
});

/* -------------------------------------------------------------------------- */

const USER_ROW = {
  id: "user-1",
  username: "ALICE",
  role: "MENTOR",
  organizationId: "org-1",
  disabledAt: null,
  lastSeen: null,
  oneTimePassword: "secret",
  organization: { id: "org-1" },
  adminForCourses: [],
};

function mockDb(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(USER_ROW),
      update: vi.fn().mockResolvedValue(USER_ROW),
    },
    session: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    ...overrides,
  } as unknown as Db;
}

function mockAuth(opts: { session?: unknown; verify?: unknown }): {
  auth: ServerAuth;
  getSession: ReturnType<typeof vi.fn>;
  verifyApiKey: ReturnType<typeof vi.fn>;
} {
  const getSession = vi.fn().mockResolvedValue(opts.session ?? null);
  const verifyApiKey = vi
    .fn()
    .mockResolvedValue(opts.verify ?? { valid: false, key: null });
  return {
    auth: { api: { getSession, verifyApiKey } } as unknown as ServerAuth,
    getSession,
    verifyApiKey,
  };
}

const VALID_KEY_RECORD = {
  valid: true,
  key: {
    id: "key-1",
    userId: "user-1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-02"),
    expiresAt: new Date("2099-01-01"),
  },
};

describe("resolveSession", () => {
  it("uses an interactive session and never verifies a key", async () => {
    const { auth, verifyApiKey } = mockAuth({
      session: { user: { id: "user-1", role: "ADMIN" }, session: { id: "s1" } },
    });

    const result = await resolveSession({
      auth,
      db: mockDb(),
      headers: headers({ "x-api-key": KEY }),
    });

    expect(result.authMethod).toBe("session");
    expect(result.user?.id).toBe("user-1");
    expect(verifyApiKey).not.toHaveBeenCalled();
  });

  it("falls back to an API key and returns an enriched user", async () => {
    const { auth, verifyApiKey } = mockAuth({ verify: VALID_KEY_RECORD });

    const result = await resolveSession({
      auth,
      db: mockDb(),
      headers: headers({ "x-api-key": KEY }),
    });

    expect(verifyApiKey).toHaveBeenCalledWith({ body: { key: KEY } });
    expect(result.authMethod).toBe("api-key");
    // A bare better-auth user would crash `isCourseAdmin`.
    expect(result.user?.role).toBe("MENTOR");
    expect(result.user?.organization).toEqual({ id: "org-1" });
    expect(result.user?.adminForCourses).toEqual([]);
  });

  it("strips oneTimePassword from the key-derived session", async () => {
    const { auth } = mockAuth({ verify: VALID_KEY_RECORD });

    const result = await resolveSession({
      auth,
      db: mockDb(),
      headers: headers({ "x-api-key": KEY }),
    });

    expect(result.user).not.toHaveProperty("oneTimePassword");
  });

  it("never puts the plaintext key in the synthetic session", async () => {
    const { auth } = mockAuth({ verify: VALID_KEY_RECORD });

    const result = await resolveSession({
      auth,
      db: mockDb(),
      headers: headers({ "x-api-key": KEY }),
    });

    expect(JSON.stringify(result.session)).not.toContain(KEY);
    expect(result.session?.token).toBe("key-1");
  });

  it("does not bump lastSeen for key traffic", async () => {
    const db = mockDb();
    const { auth } = mockAuth({ verify: VALID_KEY_RECORD });

    await resolveSession({ auth, db, headers: headers({ "x-api-key": KEY }) });

    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("returns anonymous for an invalid key", async () => {
    const { auth } = mockAuth({
      verify: { valid: false, key: null, error: { code: "KEY_EXPIRED" } },
    });

    const result = await resolveSession({
      auth,
      db: mockDb(),
      headers: headers({ "x-api-key": KEY }),
    });

    expect(result.user).toBeNull();
    expect(result.session).toBeNull();
  });

  it("returns anonymous when no credential is present", async () => {
    const { auth, verifyApiKey } = mockAuth({});

    const result = await resolveSession({
      auth,
      db: mockDb(),
      headers: headers({}),
    });

    expect(result.user).toBeNull();
    expect(verifyApiKey).not.toHaveBeenCalled();
  });

  it("denies a key belonging to a disabled account and kills its sessions", async () => {
    const db = mockDb({
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ ...USER_ROW, disabledAt: new Date() }),
        update: vi.fn(),
      },
    });
    const { auth } = mockAuth({ verify: VALID_KEY_RECORD });

    const result = await resolveSession({
      auth,
      db,
      headers: headers({ "x-api-key": KEY }),
    });

    expect(result.user).toBeNull();
    expect(db.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });

  it("returns anonymous when the key references a missing user", async () => {
    const db = mockDb({
      user: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() },
    });
    const { auth } = mockAuth({ verify: VALID_KEY_RECORD });

    const result = await resolveSession({
      auth,
      db,
      headers: headers({ "x-api-key": KEY }),
    });

    expect(result.user).toBeNull();
  });

  it("does not throw when getSession rejects", async () => {
    const onError = vi.fn();
    const auth = {
      api: {
        getSession: vi.fn().mockRejectedValue(new Error("boom")),
        verifyApiKey: vi.fn().mockResolvedValue(VALID_KEY_RECORD),
      },
    } as unknown as ServerAuth;

    const result = await resolveSession({
      auth,
      db: mockDb(),
      headers: headers({ "x-api-key": KEY }),
      onError,
    });

    expect(onError).toHaveBeenCalled();
    // A failed cookie lookup must not block the key path.
    expect(result.authMethod).toBe("api-key");
  });
});
