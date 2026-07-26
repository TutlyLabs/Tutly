import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@tutly/auth/session";

const session = vi.hoisted(() => ({
  current: null as { user: SessionUser | null } | null,
}));

vi.mock("@/lib/auth/client", () => ({
  useClientSession: () => ({ data: session.current }),
}));

import {
  Can,
  PermissionGate,
  useCan,
  useCanAll,
  useCanAny,
  useIsCourseAdmin,
} from "./client";

function signIn(user: Partial<SessionUser> | null) {
  session.current = user
    ? { user: { adminForCourses: [], isAdmin: false, ...user } as SessionUser }
    : null;
}

/** Renders a hook once and returns its value. */
function hook<T>(use: () => T): T {
  let value!: T;
  function Probe() {
    value = use();
    return null;
  }
  renderToStaticMarkup(<Probe />);
  return value;
}

const render = (element: React.ReactElement) => renderToStaticMarkup(element);

beforeEach(() => {
  signIn({ role: "STUDENT" });
});

describe("useCan", () => {
  it("accepts the typed resource/action form", () => {
    signIn({ role: "INSTRUCTOR" });
    expect(hook(() => useCan("course", "update"))).toBe(true);
    expect(hook(() => useCan("organization", "create"))).toBe(false);
  });

  it("accepts a full check", () => {
    expect(hook(() => useCan({ any: [{ course: ["list"] }] }))).toBe(true);
    expect(hook(() => useCan({ none: [{ course: ["list"] }] }))).toBe(false);
  });

  it("fails closed with no session", () => {
    signIn(null);
    expect(hook(() => useCan("course", "list"))).toBe(false);
  });
});

describe("useCanAny / useCanAll", () => {
  it("useCanAny needs one passing check", () => {
    expect(
      hook(() =>
        useCanAny([{ all: [{ course: ["manage"] }] }, { all: [{ course: ["list"] }] }]),
      ),
    ).toBe(true);
    expect(hook(() => useCanAny([{ all: [{ course: ["manage"] }] }]))).toBe(false);
  });

  it("useCanAll needs every check, and denies an empty list", () => {
    expect(
      hook(() =>
        useCanAll([{ all: [{ course: ["list"] }] }, { all: [{ note: ["list"] }] }]),
      ),
    ).toBe(true);
    expect(hook(() => useCanAll([]))).toBe(false);
  });
});

describe("useIsCourseAdmin", () => {
  it("reads course-scoped admin off the session", () => {
    signIn({
      role: "MENTOR",
      adminForCourses: [{ id: "c1" }],
    } as Partial<SessionUser>);
    expect(hook(() => useIsCourseAdmin("c1"))).toBe(true);
    expect(hook(() => useIsCourseAdmin("c2"))).toBe(false);
    expect(hook(() => useIsCourseAdmin(null))).toBe(false);
  });
});

describe("<Can>", () => {
  it("renders children when the permission holds", () => {
    signIn({ role: "INSTRUCTOR" });
    expect(
      render(
        <Can resource="course" action="update">
          <b>ok</b>
        </Can>,
      ),
    ).toBe("<b>ok</b>");
  });

  it("renders nothing by default when it does not", () => {
    expect(
      render(
        <Can resource="course" action="update">
          <b>ok</b>
        </Can>,
      ),
    ).toBe("");
  });

  it("renders the fallback when supplied", () => {
    expect(
      render(
        <Can resource="course" action="update" fallback={<i>no</i>}>
          <b>ok</b>
        </Can>,
      ),
    ).toBe("<i>no</i>");
  });

  it("supports any / all / check forms", () => {
    expect(
      render(
        <Can any={[{ all: [{ course: ["manage"] }] }, { all: [{ course: ["list"] }] }]}>
          <b>ok</b>
        </Can>,
      ),
    ).toBe("<b>ok</b>");
    expect(
      render(
        <Can all={[{ all: [{ course: ["list"] }] }, { all: [{ course: ["manage"] }] }]}>
          <b>ok</b>
        </Can>,
      ),
    ).toBe("");
    expect(
      render(
        <Can check={{ none: [{ submission: ["list"] }] }}>
          <b>learner</b>
        </Can>,
      ),
    ).toBe("<b>learner</b>");
  });

  it("gates on course scope", () => {
    signIn({
      role: "INSTRUCTOR",
      adminForCourses: [{ id: "c1" }],
    } as Partial<SessionUser>);
    const gate = (courseId: string) =>
      render(
        <Can check={{ all: [{ class: ["create"] }], courseId }}>
          <b>add</b>
        </Can>,
      );
    expect(gate("c1")).toBe("<b>add</b>");
    expect(gate("c2")).toBe("");
  });

  it("fails closed with no session", () => {
    signIn(null);
    expect(
      render(
        <Can resource="course" action="list">
          <b>ok</b>
        </Can>,
      ),
    ).toBe("");
  });

  it("PermissionGate is the same component", () => {
    expect(PermissionGate).toBe(Can);
  });
});
