import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Role } from "@tutly/db/browser";
import type { SessionUser } from "@tutly/auth/session";

import {
  isMentorOfStudent,
  requireCourseManageAccess,
  requireRecordOwner,
  requireSameOrganization,
  resolveTargetUsername,
} from "./lib/authorization";
import type { SessionContext, TRPCContext } from "./trpc";
import {
  createCallerFactory,
  createTRPCRouter,
  permissionProcedure,
  protectedProcedure,
  staffProcedure,
  superAdminProcedure,
} from "./trpc";

vi.mock("@tutly/db", () => ({ db: {} }));

const ORG = "org-1";

/** Only the fields any authorization path actually reads; the rest is irrelevant. */
function user(role: Role, overrides: Record<string, unknown> = {}): SessionUser {
  return {
    id: "user-1",
    username: "alice",
    role,
    organizationId: ORG,
    adminForCourses: [],
    ...overrides,
  } as unknown as SessionUser;
}

function makeCtx(
  sessionUser: SessionUser | null,
  db: Record<string, unknown> = {},
): TRPCContext {
  const session = sessionUser
    ? ({ user: sessionUser, session: {} } as unknown as SessionContext)
    : null;
  return {
    db: db as unknown as TRPCContext["db"],
    session,
    token: null,
    source: "test",
    headers: new Headers(),
  };
}

const router = createTRPCRouter({
  anyone: protectedProcedure.query(() => "ok"),
  staffOnly: staffProcedure.query(() => "ok"),
  superAdminOnly: superAdminProcedure.query(() => "ok"),
  updateCourse: permissionProcedure("course", "update").query(() => "ok"),
  readCourse: permissionProcedure("course", "read").query(() => "ok"),
  deleteAnyDoubt: permissionProcedure("doubt", "deleteAny").query(() => "ok"),
});

const caller = (sessionUser: SessionUser | null) =>
  createCallerFactory(router)(makeCtx(sessionUser));

async function codeOf(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (error) {
    return error instanceof TRPCError ? error.code : "NOT_A_TRPC_ERROR";
  }
  return "NO_ERROR";
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

describe("protectedProcedure", () => {
  it("rejects an unauthenticated caller with UNAUTHORIZED", async () => {
    expect(await codeOf(() => caller(null).anyone())).toBe("UNAUTHORIZED");
  });

  it("passes any authenticated role", async () => {
    await expect(caller(user("STUDENT")).anyone()).resolves.toBe("ok");
  });
});

describe("staffProcedure", () => {
  it.each(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"] as const)(
    "passes %s",
    async (role) => {
      await expect(caller(user(role)).staffOnly()).resolves.toBe("ok");
    },
  );

  it.each(["STUDENT", "MENTOR"] as const)("rejects %s", async (role) => {
    expect(await codeOf(() => caller(user(role)).staffOnly())).toBe("FORBIDDEN");
  });

  it("rejects an unauthenticated caller with UNAUTHORIZED, not FORBIDDEN", async () => {
    expect(await codeOf(() => caller(null).staffOnly())).toBe("UNAUTHORIZED");
  });
});

describe("superAdminProcedure", () => {
  it("passes SUPER_ADMIN and rejects ADMIN", async () => {
    await expect(caller(user("SUPER_ADMIN")).superAdminOnly()).resolves.toBe(
      "ok",
    );
    expect(await codeOf(() => caller(user("ADMIN")).superAdminOnly())).toBe(
      "FORBIDDEN",
    );
  });
});

describe("permissionProcedure", () => {
  it("grants course:update to INSTRUCTOR and above only", async () => {
    await expect(caller(user("INSTRUCTOR")).updateCourse()).resolves.toBe("ok");
    expect(await codeOf(() => caller(user("MENTOR")).updateCourse())).toBe(
      "FORBIDDEN",
    );
    expect(await codeOf(() => caller(user("STUDENT")).updateCourse())).toBe(
      "FORBIDDEN",
    );
  });

  it("grants course:read to every role, per the superset invariant", async () => {
    for (const role of [
      "STUDENT",
      "MENTOR",
      "INSTRUCTOR",
      "ADMIN",
      "SUPER_ADMIN",
    ] as const) {
      await expect(caller(user(role)).readCourse()).resolves.toBe("ok");
    }
  });

  it("gates doubt:deleteAny at INSTRUCTOR", async () => {
    expect(await codeOf(() => caller(user("MENTOR")).deleteAnyDoubt())).toBe(
      "FORBIDDEN",
    );
    await expect(caller(user("INSTRUCTOR")).deleteAnyDoubt()).resolves.toBe(
      "ok",
    );
  });

  it("rejects an unauthenticated caller with UNAUTHORIZED", async () => {
    expect(await codeOf(() => caller(null).updateCourse())).toBe("UNAUTHORIZED");
  });
});

describe("organization tenancy", () => {
  it("allows a same-org target", () => {
    expect(() =>
      requireSameOrganization(user("MENTOR"), {
        id: "other",
        organizationId: ORG,
      }),
    ).not.toThrow();
  });

  it("hides a cross-org target behind NOT_FOUND", async () => {
    expect(
      await codeOf(async () =>
        requireSameOrganization(user("SUPER_ADMIN"), {
          id: "other",
          organizationId: "org-2",
        }),
      ),
    ).toBe("NOT_FOUND");
  });

  it("never matches two null organizations", async () => {
    expect(
      await codeOf(async () =>
        requireSameOrganization(user("ADMIN", { organizationId: null }), {
          id: "other",
          organizationId: null,
        }),
      ),
    ).toBe("NOT_FOUND");
  });
});

describe("requireCourseManageAccess", () => {
  const course = {
    id: "course-1",
    createdById: "owner-1",
    courseAdmins: [{ id: "admin-1" }],
  };
  const db = { course: { findUnique: async () => course } };

  it("passes the course owner", async () => {
    const ctx = makeCtx(user("STUDENT", { id: "owner-1" }), db);
    await expect(requireCourseManageAccess(ctx, "course-1")).resolves.toEqual(
      course,
    );
  });

  it("passes an explicit course admin", async () => {
    const ctx = makeCtx(user("MENTOR", { id: "admin-1" }), db);
    await expect(requireCourseManageAccess(ctx, "course-1")).resolves.toEqual(
      course,
    );
  });

  it("passes a user holding the course via adminForCourses", async () => {
    const ctx = makeCtx(
      user("MENTOR", { id: "someone", adminForCourses: [{ id: "course-1" }] }),
      db,
    );
    await expect(requireCourseManageAccess(ctx, "course-1")).resolves.toEqual(
      course,
    );
  });

  it("rejects an unrelated non-staff user with NOT_FOUND, not FORBIDDEN", async () => {
    const ctx = makeCtx(user("STUDENT", { id: "nobody" }), db);
    expect(await codeOf(() => requireCourseManageAccess(ctx, "course-1"))).toBe(
      "NOT_FOUND",
    );
  });

  it("reports a missing course as NOT_FOUND", async () => {
    const ctx = makeCtx(user("INSTRUCTOR"), {
      course: { findUnique: async () => null },
    });
    expect(await codeOf(() => requireCourseManageAccess(ctx, "nope"))).toBe(
      "NOT_FOUND",
    );
  });
});

describe("isMentorOfStudent", () => {
  it("is true only when an enrolment links the pair", async () => {
    const ctx = (count: number) =>
      makeCtx(user("MENTOR"), {
        enrolledUsers: { count: async () => count },
      });
    await expect(isMentorOfStudent(ctx(1), "alice", "bob")).resolves.toBe(true);
    await expect(isMentorOfStudent(ctx(0), "alice", "carol")).resolves.toBe(
      false,
    );
  });
});

describe("resolveTargetUsername", () => {
  const target = {
    id: "user-2",
    username: "bob",
    role: "STUDENT" as Role,
    organizationId: ORG,
  };
  const db = (menteeCount: number, organizationId = ORG) => ({
    user: { findUnique: async () => ({ ...target, organizationId }) },
    enrolledUsers: { count: async () => menteeCount },
  });

  it("falls back to the caller when no username is supplied", async () => {
    const ctx = makeCtx(user("STUDENT"), db(0));
    await expect(resolveTargetUsername(ctx, undefined)).resolves.toBe("alice");
  });

  it("lets staff target anyone in their organization", async () => {
    const ctx = makeCtx(user("INSTRUCTOR"), db(0));
    await expect(resolveTargetUsername(ctx, "bob")).resolves.toBe("bob");
  });

  it("lets a mentor target their own mentee", async () => {
    const ctx = makeCtx(user("MENTOR"), db(1));
    await expect(resolveTargetUsername(ctx, "bob")).resolves.toBe("bob");
  });

  it("rejects a mentor targeting someone else's student", async () => {
    const ctx = makeCtx(user("MENTOR"), db(0));
    expect(await codeOf(() => resolveTargetUsername(ctx, "bob"))).toBe(
      "FORBIDDEN",
    );
  });

  it("rejects a student targeting another student", async () => {
    const ctx = makeCtx(user("STUDENT"), db(0));
    expect(await codeOf(() => resolveTargetUsername(ctx, "bob"))).toBe(
      "FORBIDDEN",
    );
  });

  it("hides a cross-organization target from staff behind NOT_FOUND", async () => {
    const ctx = makeCtx(user("SUPER_ADMIN"), db(0, "org-2"));
    expect(await codeOf(() => resolveTargetUsername(ctx, "bob"))).toBe(
      "NOT_FOUND",
    );
  });
});

describe("requireRecordOwner", () => {
  const ctx = makeCtx(user("STUDENT"));

  it("passes the owner by userId and by username", () => {
    expect(() => requireRecordOwner(ctx, { userId: "user-1" })).not.toThrow();
    expect(() => requireRecordOwner(ctx, { username: "alice" })).not.toThrow();
  });

  it("rejects a non-owner with NOT_FOUND", async () => {
    expect(
      await codeOf(async () => requireRecordOwner(ctx, { userId: "user-9" })),
    ).toBe("NOT_FOUND");
  });

  it("admits staff only when allowStaff is set", async () => {
    const staffCtx = makeCtx(user("ADMIN", { id: "admin-9" }));
    expect(
      await codeOf(async () =>
        requireRecordOwner(staffCtx, { userId: "user-1" }),
      ),
    ).toBe("NOT_FOUND");
    expect(() =>
      requireRecordOwner(staffCtx, { userId: "user-1" }, { allowStaff: true }),
    ).not.toThrow();
  });
});
