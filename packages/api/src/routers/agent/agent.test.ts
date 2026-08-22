import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@tutly/auth/session";
import type { Role } from "@tutly/db/browser";

import type { SessionContext, TRPCContext } from "../../trpc";
import { agentRouter } from ".";
import { createCallerFactory } from "../../trpc";

vi.mock("@tutly/db", () => ({ db: {} }));

const ORG = "org-1";
const COURSE = "course-1";
const CLASS = "class-1";

function user(
  role: Role,
  overrides: Record<string, unknown> = {},
): SessionUser {
  return {
    id: "user-1",
    username: "ALICE",
    name: "Alice",
    role,
    organizationId: ORG,
    organization: { id: ORG, name: "Acme" },
    adminForCourses: [{ id: COURSE }],
    ...overrides,
  } as unknown as SessionUser;
}

/**
 * Access helpers hit `course.findUnique`, so the double must always resolve a
 * manageable course; otherwise tests fail on authorization, not behaviour.
 */
function makeDb(overrides: Record<string, unknown> = {}) {
  const course = {
    id: COURSE,
    createdById: "user-1",
    courseAdmins: [{ id: "user-1" }],
  };
  return {
    course: {
      findUnique: vi.fn().mockResolvedValue(course),
      findMany: vi.fn().mockResolvedValue([{ id: COURSE, title: "DSA" }]),
    },
    class: {
      findUnique: vi.fn().mockResolvedValue({ id: CLASS, courseId: COURSE }),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn().mockResolvedValue({ id: CLASS }),
    },
    attachment: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    enrolledUsers: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn() },
    assignmentConfig: { upsert: vi.fn() },
    assignmentTestCase: { deleteMany: vi.fn(), createMany: vi.fn() },
    folder: { create: vi.fn().mockResolvedValue({ id: "folder-1" }) },
    video: { update: vi.fn() },
    $transaction: vi.fn(),
    ...overrides,
  };
}

function makeCtx(
  sessionUser: SessionUser | null,
  db: Record<string, unknown>,
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
    authMethod: "api-key",
  };
}

const caller = (sessionUser: SessionUser | null, db = makeDb()) =>
  createCallerFactory(agentRouter)(makeCtx(sessionUser, db));

async function codeOf(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (error) {
    return error instanceof TRPCError ? error.code : "NOT_A_TRPC_ERROR";
  }
  return "NO_ERROR";
}

async function messageOf(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (error) {
    return error instanceof TRPCError ? error.message : String(error);
  }
  return "NO_ERROR";
}

/* -------------------------------------------------------------------------- */
/* Grants                                                                     */
/* -------------------------------------------------------------------------- */

describe("class write grants", () => {
  it("lets an instructor create", async () => {
    const result = await caller(user("INSTRUCTOR")).classes.upsert({
      courseId: COURSE,
      title: "Week 1",
      dryRun: true,
    });
    expect(result.dryRun).toBe(true);
    expect(result.action).toBe("create");
  });

  // MENTOR_GRANTS holds class:["read","list"] only.
  it("denies a mentor creating a class", async () => {
    expect(
      await codeOf(() =>
        caller(user("MENTOR")).classes.upsert({
          courseId: COURSE,
          title: "Week 1",
          dryRun: true,
        }),
      ),
    ).toBe("FORBIDDEN");
  });

  it("denies a student", async () => {
    expect(
      await codeOf(() =>
        caller(user("STUDENT")).classes.upsert({
          courseId: COURSE,
          title: "Week 1",
          dryRun: true,
        }),
      ),
    ).toBe("FORBIDDEN");
  });

  it("rejects an unauthenticated caller with UNAUTHORIZED", async () => {
    expect(await codeOf(() => caller(null).resolve.whoami())).toBe(
      "UNAUTHORIZED",
    );
  });

  it("checks update, not create, when a classId is given", async () => {
    const result = await caller(user("INSTRUCTOR")).classes.upsert({
      classId: CLASS,
      courseId: COURSE,
      title: "Week 1 (revised)",
      dryRun: true,
    });
    expect(result.action).toBe("update");
  });
});

/* -------------------------------------------------------------------------- */
/* Class input validation                                                     */
/* -------------------------------------------------------------------------- */

describe("classes.upsert validation", () => {
  const instructor = () => caller(user("INSTRUCTOR"));

  it("rejects folderId and folderName together", async () => {
    expect(
      await messageOf(() =>
        instructor().classes.upsert({
          courseId: COURSE,
          title: "Week 1",
          folderId: "f1",
          folderName: "Week 1",
          dryRun: true,
        }),
      ),
    ).toMatch(/not both/);
  });

  it("requires a videoId for HLS", async () => {
    expect(
      await messageOf(() =>
        instructor().classes.upsert({
          courseId: COURSE,
          title: "Week 1",
          video: { type: "HLS" },
          dryRun: true,
        }),
      ),
    ).toMatch(/upload the video first/);
  });

  it("requires a provider for a live class", async () => {
    expect(
      await messageOf(() =>
        instructor().classes.upsert({
          courseId: COURSE,
          title: "Live session",
          classType: "LIVE",
          dryRun: true,
        }),
      ),
    ).toMatch(/live\.provider/);
  });

  it("rejects a live window that ends before it starts", async () => {
    expect(
      await messageOf(() =>
        instructor().classes.upsert({
          courseId: COURSE,
          title: "Live session",
          classType: "LIVE",
          live: {
            provider: "ZOOM",
            startTime: "2026-03-02T10:00:00Z",
            endTime: "2026-03-02T09:00:00Z",
          },
          dryRun: true,
        }),
      ),
    ).toMatch(/after live\.startTime/);
  });

  it("accepts a valid live window", async () => {
    const result = await instructor().classes.upsert({
      courseId: COURSE,
      title: "Live session",
      classType: "LIVE",
      live: {
        provider: "ZOOM",
        startTime: "2026-03-02T09:00:00Z",
        endTime: "2026-03-02T10:30:00Z",
      },
      dryRun: true,
    });
    expect(result.classType).toBe("LIVE");
  });

  it("rejects a class whose id belongs to another course", async () => {
    const db = makeDb({
      class: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: CLASS, courseId: "other-course" }),
      },
    });
    // The access helper resolves the class's own course, which this caller does
    // administer, so only the explicit cross-check catches the mismatch.
    expect(
      await messageOf(() =>
        caller(user("INSTRUCTOR"), db).classes.upsert({
          classId: CLASS,
          courseId: COURSE,
          title: "Week 1",
          dryRun: true,
        }),
      ),
    ).toMatch(/does not belong to the given course/);
  });

  it("does not write anything on a dry run", async () => {
    const db = makeDb();
    await caller(user("INSTRUCTOR"), db).classes.upsert({
      courseId: COURSE,
      title: "Week 1",
      dryRun: true,
    });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.class.create).not.toHaveBeenCalled();
  });
});

/* -------------------------------------------------------------------------- */
/* Assignment input validation                                                */
/* -------------------------------------------------------------------------- */

describe("assignments.upsert validation", () => {
  const instructor = (db = makeDb()) => caller(user("INSTRUCTOR"), db);

  it("requires a class or course when creating", async () => {
    expect(
      await messageOf(() =>
        instructor().assignments.upsert({
          title: "Binary search",
          dryRun: true,
        }),
      ),
    ).toMatch(/classId or courseId/);
  });

  it("implies WORKSPACE mode when test cases are supplied", async () => {
    const result = await instructor().assignments.upsert({
      courseId: COURSE,
      title: "Binary search",
      testCases: [{ title: "finds the target", command: "pnpm test" }],
      dryRun: true,
    });
    expect(result.submissionMode).toBe("WORKSPACE");
  });

  it("rejects test cases alongside a non-workspace submission mode", async () => {
    expect(
      await messageOf(() =>
        instructor().assignments.upsert({
          courseId: COURSE,
          title: "Binary search",
          submissionMode: "EXTERNAL_LINK",
          testCases: [{ title: "t", command: "pnpm test" }],
          dryRun: true,
        }),
      ),
    ).toMatch(/require submissionMode WORKSPACE/);
  });

  // Titles map results back to cases, so duplicates are unattributable.
  it("rejects duplicate test case titles, case-insensitively", async () => {
    expect(
      await messageOf(() =>
        instructor().assignments.upsert({
          courseId: COURSE,
          title: "Binary search",
          testCases: [
            { title: "Finds target", command: "a" },
            { title: "finds target", command: "b" },
          ],
          dryRun: true,
        }),
      ),
    ).toMatch(/Duplicate test case titles/);
  });

  it("reports point totals and hidden counts in the dry run", async () => {
    const result = await instructor().assignments.upsert({
      courseId: COURSE,
      title: "Binary search",
      testCases: [
        { title: "visible", command: "a", points: 2 },
        {
          title: "hidden edge case",
          command: "b",
          points: 3,
          visibility: "HIDDEN",
        },
      ],
      dryRun: true,
    });
    expect(result.testCases).toMatchObject({
      replacing: true,
      count: 2,
      totalPoints: 5,
      hidden: 1,
    });
  });

  it("distinguishes an omitted suite from an emptied one", async () => {
    const omitted = await instructor().assignments.upsert({
      courseId: COURSE,
      title: "Binary search",
      dryRun: true,
    });
    expect(omitted.testCases).toEqual({ replacing: false });

    const cleared = await instructor().assignments.upsert({
      courseId: COURSE,
      title: "Binary search",
      testCases: [],
      dryRun: true,
    });
    expect(cleared.testCases).toMatchObject({ replacing: true, count: 0 });
  });

  it("denies a mentor authoring an assignment", async () => {
    expect(
      await codeOf(() =>
        caller(user("MENTOR")).assignments.upsert({
          courseId: COURSE,
          title: "Binary search",
          dryRun: true,
        }),
      ),
    ).toBe("FORBIDDEN");
  });

  it("rejects a due date that is not a real date", async () => {
    expect(
      await codeOf(() =>
        instructor().assignments.upsert({
          courseId: COURSE,
          title: "Binary search",
          dueDate: "next friday",
          dryRun: true,
        }),
      ),
    ).toBe("BAD_REQUEST");
  });

  it("accepts a bare calendar date as a due date", async () => {
    await expect(
      instructor().assignments.upsert({
        courseId: COURSE,
        title: "Binary search",
        dueDate: "2026-03-06",
        dryRun: true,
      }),
    ).resolves.toMatchObject({ dryRun: true });
  });
});

/* -------------------------------------------------------------------------- */
/* Commit paths                                                               */
/* -------------------------------------------------------------------------- */

describe("assignments.upsert commit", () => {
  it("creates config and test cases inside one transaction", async () => {
    const created = {
      id: "a1",
      title: "Binary search",
      classId: CLASS,
      courseId: null,
      submissionMode: "WORKSPACE",
      dueDate: null,
    };
    const tx = {
      attachment: {
        create: vi.fn().mockResolvedValue(created),
        update: vi.fn(),
      },
      assignmentConfig: { upsert: vi.fn() },
      assignmentTestCase: { deleteMany: vi.fn(), createMany: vi.fn() },
    };
    const db = makeDb({
      $transaction: vi.fn((fn: (t: unknown) => unknown) => fn(tx)),
    });

    const result = await caller(user("INSTRUCTOR"), db).assignments.upsert({
      classId: CLASS,
      title: "Binary search",
      workspace: { testCommand: "pnpm vitest run" },
      testCases: [{ title: "finds the target", command: "pnpm vitest run" }],
      dryRun: false,
    });

    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(tx.attachment.create).toHaveBeenCalledOnce();
    expect(tx.assignmentConfig.upsert).toHaveBeenCalledOnce();
    // Replaced wholesale so a stale case cannot survive an edit.
    expect(tx.assignmentTestCase.deleteMany).toHaveBeenCalledOnce();
    expect(tx.assignmentTestCase.createMany).toHaveBeenCalledOnce();
    // Discriminated union: narrow before reading.
    expect(result.dryRun).toBe(false);
    if (result.dryRun) throw new Error("expected a committed result");
    expect(result.assignment.id).toBe("a1");
    expect(result.testCases).toEqual({ count: 1, totalPoints: 1 });
  });

  it("leaves the suite alone when testCases is omitted", async () => {
    const tx = {
      attachment: {
        create: vi.fn().mockResolvedValue({
          id: "a1",
          title: "t",
          classId: CLASS,
          courseId: null,
          submissionMode: "HTML_CSS_JS",
          dueDate: null,
        }),
        update: vi.fn(),
      },
      assignmentConfig: { upsert: vi.fn() },
      assignmentTestCase: { deleteMany: vi.fn(), createMany: vi.fn() },
    };
    const db = makeDb({
      $transaction: vi.fn((fn: (t: unknown) => unknown) => fn(tx)),
    });

    await caller(user("INSTRUCTOR"), db).assignments.upsert({
      classId: CLASS,
      title: "t",
      dryRun: false,
    });

    expect(tx.assignmentTestCase.deleteMany).not.toHaveBeenCalled();
    expect(tx.assignmentConfig.upsert).not.toHaveBeenCalled();
  });
});

/* -------------------------------------------------------------------------- */
/* Deletes                                                                    */
/* -------------------------------------------------------------------------- */

describe("deletes report impact before committing", () => {
  it("previews a class delete without deleting", async () => {
    const db = makeDb({
      class: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ id: CLASS, courseId: COURSE })
          .mockResolvedValueOnce({
            id: CLASS,
            title: "Week 1",
            _count: { attachments: 2, Attendence: 30 },
            attachments: [
              { _count: { submissions: 12 } },
              { _count: { submissions: 3 } },
            ],
          }),
        delete: vi.fn(),
      },
    });

    const result = await caller(user("INSTRUCTOR"), db).classes.delete({
      classId: CLASS,
      dryRun: true,
    });

    expect(result).toMatchObject({
      dryRun: true,
      impact: {
        attachments: 2,
        attendanceRecords: 30,
        submittedSubmissions: 15,
      },
    });
    expect(db.class.delete).not.toHaveBeenCalled();
  });

  it("denies a mentor deleting a class", async () => {
    expect(
      await codeOf(() =>
        caller(user("MENTOR")).classes.delete({
          classId: CLASS,
          dryRun: true,
        }),
      ),
    ).toBe("FORBIDDEN");
  });
});

/* -------------------------------------------------------------------------- */
/* Resolve                                                                    */
/* -------------------------------------------------------------------------- */

describe("resolve.lookup", () => {
  it("matches course titles case-insensitively", async () => {
    const db = makeDb({
      course: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([
          { id: COURSE, title: "Data Structures", isPublished: true },
          { id: "c2", title: "Web Dev", isPublished: true },
        ]),
      },
    });

    const result = await caller(user("MENTOR"), db).resolve.lookup({
      query: "data",
      kind: "course",
    });

    expect(result.courses).toHaveLength(1);
    expect(result.courses[0]?.id).toBe(COURSE);
  });

  // A title match must not reach outside the caller's courses.
  it("skips class and assignment lookups when no course is visible", async () => {
    const db = makeDb({
      course: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    });

    const result = await caller(user("MENTOR"), db).resolve.lookup({
      query: "anything",
    });

    expect(result.totalMatches).toBe(0);
    expect(db.class.findMany).not.toHaveBeenCalled();
    expect(db.attachment.findMany).not.toHaveBeenCalled();
  });

  it("reports how the caller authenticated", async () => {
    const result = await caller(user("INSTRUCTOR")).resolve.whoami();
    expect(result.authMethod).toBe("api-key");
    expect(result.role).toBe("INSTRUCTOR");
  });
});
