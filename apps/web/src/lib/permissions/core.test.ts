import { describe, expect, it } from "vitest";

import { ROLE_NAMES } from "@tutly/auth/permissions";
import type { SessionUser } from "@tutly/auth/session";

import type { PermissionCheck, PermissionContext } from "./core";
import {
  ANONYMOUS_CONTEXT,
  can,
  canActAsInstructor,
  canDo,
  canEscalateViaIsAdmin,
  isCourseAdmin,
  toCheck,
  toPermissionContext,
} from "./core";

const ctx = (over: Partial<PermissionContext> = {}): PermissionContext => ({
  role: "STUDENT",
  isAdmin: false,
  adminForCourseIds: [],
  ...over,
});

describe("can", () => {
  it("fails closed without a role", () => {
    expect(can(ANONYMOUS_CONTEXT, { all: [{ course: ["list"] }] })).toBe(false);
  });

  it("fails closed for an unknown role", () => {
    const unknown = {
      role: "PRINCIPAL",
      isAdmin: false,
      adminForCourseIds: [],
    };
    expect(
      can(unknown as unknown as PermissionContext, {
        all: [{ course: ["list"] }],
      }),
    ).toBe(false);
  });

  it("fails closed when the check asserts nothing", () => {
    expect(can(ctx(), {})).toBe(false);
    expect(can(ctx(), { all: [], any: [], none: [] })).toBe(false);
    expect(can(ctx({ role: "SUPER_ADMIN" }), {})).toBe(false);
  });

  it("requires every entry of `all`", () => {
    expect(
      can(ctx({ role: "MENTOR" }), {
        all: [{ submission: ["list"] }, { attendance: ["list"] }],
      }),
    ).toBe(true);
    expect(
      can(ctx({ role: "MENTOR" }), {
        all: [{ submission: ["list"] }, { course: ["manage"] }],
      }),
    ).toBe(false);
  });

  it("requires one entry of `any`", () => {
    expect(
      can(ctx(), { any: [{ course: ["manage"] }, { course: ["list"] }] }),
    ).toBe(true);
    expect(
      can(ctx(), { any: [{ course: ["manage"] }, { course: ["delete"] }] }),
    ).toBe(false);
  });

  it("rejects when any entry of `none` is granted", () => {
    expect(
      can(ctx(), {
        all: [{ course: ["list"] }],
        none: [{ submission: ["list"] }],
      }),
    ).toBe(true);
    expect(
      can(ctx({ role: "MENTOR" }), {
        all: [{ course: ["list"] }],
        none: [{ submission: ["list"] }],
      }),
    ).toBe(false);
  });

  it("combines a grant with course scope", () => {
    const instructor = ctx({
      role: "INSTRUCTOR",
      adminForCourseIds: ["course-1"],
    });
    expect(
      can(instructor, { all: [{ class: ["create"] }], courseId: "course-1" }),
    ).toBe(true);
    expect(
      can(instructor, { all: [{ class: ["create"] }], courseId: "course-2" }),
    ).toBe(false);
  });

  it("treats a null courseId as asserting no scope", () => {
    expect(can(ctx(), { courseId: null })).toBe(false);
    expect(can(ctx(), { all: [{ course: ["list"] }], courseId: null })).toBe(
      true,
    );
  });

  it("honours the superset hierarchy for a staff-only grant", () => {
    const granted = ROLE_NAMES.filter((role) =>
      can(ctx({ role }), { all: [{ course: ["manage"] }] }),
    );
    expect(granted).toEqual(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"]);
  });
});

describe("canDo", () => {
  it("accepts the resource/actions shorthand", () => {
    expect(canDo(ctx({ role: "INSTRUCTOR" }), "course", "update")).toBe(true);
    expect(canDo(ctx(), "course", "update")).toBe(false);
  });

  it("rejects an action the resource does not declare, at compile time", () => {
    // @ts-expect-error "nonsense" is not an action of `course`.
    expect(canDo(ctx({ role: "SUPER_ADMIN" }), "course", "nonsense")).toBe(
      false,
    );
    // @ts-expect-error `manage` belongs to `course`, not `note`.
    expect(canDo(ctx({ role: "SUPER_ADMIN" }), "note", "manage")).toBe(false);
  });

  it("requires every action listed", () => {
    expect(
      canDo(ctx({ role: "MENTOR" }), "submission", "list", "evaluate"),
    ).toBe(true);
    expect(canDo(ctx({ role: "MENTOR" }), "submission", "list", "update")).toBe(
      false,
    );
  });
});

describe("toCheck", () => {
  it("wraps a resource and actions into an `all` check", () => {
    expect(toCheck("course", ["update"])).toEqual({
      all: [{ course: ["update"] }],
    });
  });

  it("passes a check through untouched", () => {
    const check: PermissionCheck = { any: [{ course: ["list"] }] };
    expect(toCheck(check, [])).toBe(check);
  });
});

describe("toPermissionContext", () => {
  it("maps an anonymous user to the fail-closed context", () => {
    expect(toPermissionContext(null)).toEqual(ANONYMOUS_CONTEXT);
    expect(toPermissionContext(undefined)).toEqual(ANONYMOUS_CONTEXT);
  });

  it("projects the course ids a user administers", () => {
    const user = {
      role: "INSTRUCTOR",
      isAdmin: true,
      adminForCourses: [{ id: "a" }, { id: "b" }],
    } as unknown as SessionUser;
    expect(toPermissionContext(user)).toEqual({
      role: "INSTRUCTOR",
      isAdmin: true,
      adminForCourseIds: ["a", "b"],
    });
  });
});

describe("isCourseAdmin", () => {
  it("is false without a course id", () => {
    const c = ctx({ adminForCourseIds: ["a"] });
    expect(isCourseAdmin(c, null)).toBe(false);
    expect(isCourseAdmin(c, undefined)).toBe(false);
    expect(isCourseAdmin(c, "")).toBe(false);
  });

  it("matches only administered courses", () => {
    const c = ctx({ adminForCourseIds: ["a"] });
    expect(isCourseAdmin(c, "a")).toBe(true);
    expect(isCourseAdmin(c, "b")).toBe(false);
  });
});

describe("the two isAdmin readings", () => {
  it("canActAsInstructor restricts an isAdmin instructor", () => {
    expect(
      canActAsInstructor(ctx({ role: "INSTRUCTOR", isAdmin: false })),
    ).toBe(true);
    expect(canActAsInstructor(ctx({ role: "INSTRUCTOR", isAdmin: true }))).toBe(
      false,
    );
    expect(canActAsInstructor(ctx({ role: "ADMIN" }))).toBe(false);
    expect(canActAsInstructor(ANONYMOUS_CONTEXT)).toBe(false);
  });

  it("canEscalateViaIsAdmin widens an otherwise denied check", () => {
    const check: PermissionCheck = { all: [{ testRun: ["reap"] }] };
    expect(canEscalateViaIsAdmin(ctx({ role: "STUDENT" }), check)).toBe(false);
    expect(
      canEscalateViaIsAdmin(ctx({ role: "STUDENT", isAdmin: true }), check),
    ).toBe(true);
    expect(canEscalateViaIsAdmin(ctx({ role: "INSTRUCTOR" }), check)).toBe(
      true,
    );
  });

  it("the two readings genuinely disagree for an isAdmin instructor", () => {
    const check: PermissionCheck = { all: [{ testRun: ["reap"] }] };
    const c = ctx({ role: "INSTRUCTOR", isAdmin: true });
    expect(canActAsInstructor(c)).toBe(false);
    expect(canEscalateViaIsAdmin(c, check)).toBe(true);
  });
});
