import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@tutly/auth/session";

const state = vi.hoisted(() => ({
  user: null as SessionUser | null,
}));

/** `redirect()` throws in Next; the tests assert on that control flow. */
class RedirectError extends Error {
  constructor(public readonly to: string) {
    super(`NEXT_REDIRECT:${to}`);
  }
}

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectError(to);
  },
}));
vi.mock("@/lib/auth", () => ({
  getServerSession: () =>
    Promise.resolve(state.user ? { user: state.user, session: {} } : null),
}));

import {
  canServer,
  getPermissionContext,
  isCourseAdminServer,
  requirePermission,
} from "./server";

function signIn(user: Partial<SessionUser> | null) {
  state.user = user
    ? ({ adminForCourses: [], isAdmin: false, ...user } as SessionUser)
    : null;
}

async function redirectOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    if (error instanceof RedirectError) return error.to;
    throw error;
  }
  throw new Error("expected a redirect");
}

beforeEach(() => {
  signIn({ role: "STUDENT" });
});

describe("canServer", () => {
  it("accepts the typed resource/action form", async () => {
    signIn({ role: "INSTRUCTOR" });
    await expect(canServer("course", "update")).resolves.toBe(true);
    await expect(canServer("organization", "create")).resolves.toBe(false);
  });

  it("accepts a full check", async () => {
    await expect(canServer({ none: [{ submission: ["list"] }] })).resolves.toBe(
      true,
    );
  });

  it("fails closed with no session", async () => {
    signIn(null);
    await expect(canServer("course", "list")).resolves.toBe(false);
  });
});

describe("getPermissionContext", () => {
  it("returns the anonymous context when signed out", async () => {
    signIn(null);
    await expect(getPermissionContext()).resolves.toEqual({
      role: null,
      isAdmin: false,
      adminForCourseIds: [],
    });
  });
});

describe("isCourseAdminServer", () => {
  it("reads course-scoped admin off the session", async () => {
    signIn({
      role: "MENTOR",
      adminForCourses: [{ id: "c1" }],
    } as Partial<SessionUser>);
    await expect(isCourseAdminServer("c1")).resolves.toBe(true);
    await expect(isCourseAdminServer("c2")).resolves.toBe(false);
  });
});

describe("requirePermission", () => {
  it("returns the session when the permission holds", async () => {
    signIn({ role: "INSTRUCTOR" });
    const session = await requirePermission({ all: [{ course: ["manage"] }] });
    expect(session.user.role).toBe("INSTRUCTOR");
  });

  it("sends an anonymous visitor to sign-in, not the fallback", async () => {
    signIn(null);
    await expect(
      redirectOf(() =>
        requirePermission(
          { all: [{ course: ["manage"] }] },
          { redirectTo: "/somewhere" },
        ),
      ),
    ).resolves.toBe("/sign-in");
  });

  it("redirects a denied user to /dashboard by default", async () => {
    await expect(
      redirectOf(() => requirePermission({ all: [{ course: ["manage"] }] })),
    ).resolves.toBe("/dashboard");
  });

  it("honours an explicit redirectTo", async () => {
    await expect(
      redirectOf(() =>
        requirePermission(
          { all: [{ course: ["manage"] }] },
          { redirectTo: "/404" },
        ),
      ),
    ).resolves.toBe("/404");
  });

  it("redirects when a check asserts nothing", async () => {
    signIn({ role: "SUPER_ADMIN" });
    await expect(redirectOf(() => requirePermission({}))).resolves.toBe(
      "/dashboard",
    );
  });
});
