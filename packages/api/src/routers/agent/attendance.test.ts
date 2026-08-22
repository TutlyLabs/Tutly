import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@tutly/auth/session";
import type { Role } from "@tutly/db/browser";

import type { SessionContext, TRPCContext } from "../../trpc";
import { agentRouter } from ".";
import { createCallerFactory } from "../../trpc";

vi.mock("@tutly/db", () => ({ db: {} }));

const COURSE = "course-1";
const CLASS = "class-1";

function user(role: Role = "INSTRUCTOR"): SessionUser {
  return {
    id: "user-1",
    username: "ALICE",
    name: "Alice",
    role,
    organizationId: "org-1",
    organization: { id: "org-1", name: "Acme" },
    adminForCourses: [{ id: COURSE }],
  } as unknown as SessionUser;
}

/** The roster every test resolves against. */
const ROSTER = [
  { username: "21CS001", user: { name: "Aarav Sharma", email: "aarav@x.edu" } },
  { username: "21CS002", user: { name: "Diya Patel", email: "diya@x.edu" } },
  { username: "21CS003", user: { name: "Rohan Das", email: null } },
];

function makeDb(
  roster: typeof ROSTER = ROSTER,
  overrides: Record<string, unknown> = {},
) {
  const tx = {
    attendance: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi
        .fn()
        .mockImplementation((args: { data: unknown[] }) =>
          Promise.resolve({ count: args.data.length }),
        ),
    },
  };
  return {
    tx,
    db: {
      course: {
        findUnique: vi.fn().mockResolvedValue({
          id: COURSE,
          createdById: "user-1",
          courseAdmins: [{ id: "user-1" }],
        }),
      },
      class: {
        findUnique: vi.fn().mockResolvedValue({ id: CLASS, courseId: COURSE }),
      },
      enrolledUsers: {
        findMany: vi.fn().mockResolvedValue(roster),
        count: vi.fn().mockResolvedValue(roster.length),
      },
      attendance: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: vi.fn((fn: (t: unknown) => unknown) => fn(tx)),
      ...overrides,
    },
  };
}

function caller(sessionUser: SessionUser | null, db: Record<string, unknown>) {
  const session = sessionUser
    ? ({ user: sessionUser, session: {} } as unknown as SessionContext)
    : null;
  const ctx: TRPCContext = {
    db: db as unknown as TRPCContext["db"],
    session,
    token: null,
    source: "test",
    headers: new Headers(),
    authMethod: "api-key",
  };
  return createCallerFactory(agentRouter)(ctx);
}

async function codeOf(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (error) {
    return error instanceof TRPCError ? error.code : "NOT_A_TRPC_ERROR";
  }
  return "NO_ERROR";
}

const base = {
  classId: CLASS,
  minimumMinutes: 40,
  dryRun: true as const,
};

describe("attendance.import identity resolution", () => {
  it("matches on email in preference to anything else", async () => {
    const { db } = makeDb();
    const result = await caller(user(), db).attendance.import({
      ...base,
      participants: [
        // Name says Diya, email says Aarav. Email wins.
        { name: "Diya Patel", email: "aarav@x.edu", durationMinutes: 50 },
      ],
    });

    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]).toMatchObject({
      username: "21CS001",
      matchedBy: "email",
      attended: true,
    });
  });

  it("matches on full name when there is no email", async () => {
    const { db } = makeDb();
    const result = await caller(user(), db).attendance.import({
      ...base,
      participants: [{ name: "Rohan Das", durationMinutes: 45 }],
    });

    expect(result.matched[0]).toMatchObject({
      username: "21CS003",
      matchedBy: "full-name",
    });
  });

  it("falls back to the roll-number prefix heuristic", async () => {
    const { db } = makeDb();
    const result = await caller(user(), db).attendance.import({
      ...base,
      // What the old flow relied on: display name is the roll number.
      participants: [{ name: "21CS002", durationMinutes: 60 }],
    });

    expect(result.matched[0]).toMatchObject({
      username: "21CS002",
      matchedBy: "name-prefix",
    });
    // Weak matches are surfaced so a reviewer can eyeball them.
    expect(result.counts.weakMatches).toBe(1);
  });

  it("is case- and whitespace-insensitive", async () => {
    const { db } = makeDb();
    const result = await caller(user(), db).attendance.import({
      ...base,
      participants: [
        { name: "  aarav sharma  ", durationMinutes: 41 },
        { email: "  DIYA@X.EDU ", durationMinutes: 41 },
      ],
    });

    expect(result.matched.map((row) => row.username).sort()).toEqual([
      "21CS001",
      "21CS002",
    ]);
  });

  /**
   * The regression that motivated this tool: a renamed participant used to
   * vanish silently. Now the row is reported.
   */
  it("reports a renamed participant instead of dropping them", async () => {
    const { db } = makeDb();
    const result = await caller(user(), db).attendance.import({
      ...base,
      participants: [{ name: "iPhone von Aarav", durationMinutes: 55 }],
    });

    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toEqual([
      { name: "iPhone von Aarav", email: undefined },
    ]);
    expect(result.counts.unmatched).toBe(1);
  });

  it("reports an ambiguous name rather than guessing", async () => {
    const { db } = makeDb([
      {
        username: "21CS001",
        user: { name: "Aarav Sharma", email: "a1@x.edu" },
      },
      {
        username: "21CS009",
        user: { name: "Aarav Sharma", email: "a2@x.edu" },
      },
    ]);

    const result = await caller(user(), db).attendance.import({
      ...base,
      participants: [{ name: "Aarav Sharma", durationMinutes: 50 }],
    });

    expect(result.matched).toHaveLength(0);
    expect(result.counts.ambiguous).toBe(1);
  });

  it("lists enrolled students missing from the report as absent", async () => {
    const { db } = makeDb();
    const result = await caller(user(), db).attendance.import({
      ...base,
      participants: [{ email: "aarav@x.edu", durationMinutes: 50 }],
    });

    expect(result.counts.notInReport).toBe(2);
    expect(result.notInReport.map((row) => row.username).sort()).toEqual([
      "21CS002",
      "21CS003",
    ]);
  });
});

describe("attendance.import aggregation", () => {
  it("sums minutes across rejoins and keeps every interval", async () => {
    const { db, tx } = makeDb();
    const result = await caller(user(), db).attendance.import({
      classId: CLASS,
      minimumMinutes: 40,
      dryRun: false,
      participants: [
        {
          email: "aarav@x.edu",
          durationMinutes: 25,
          joinTime: "10:00",
          leaveTime: "10:25",
        },
        {
          email: "aarav@x.edu",
          durationMinutes: 20,
          joinTime: "10:30",
          leaveTime: "10:50",
        },
      ],
    });

    // 25 + 20 = 45, over the 40-minute threshold. Either row alone would be under.
    expect(result.matched[0]).toMatchObject({ minutes: 45, attended: true });

    const written = tx.attendance.createMany.mock.calls[0]?.[0] as {
      data: Array<{ attendedDuration: number; data: unknown[] }>;
    };
    expect(written.data[0]?.attendedDuration).toBe(45);
    expect(written.data[0]?.data).toHaveLength(2);
  });

  it("marks below-threshold attendees present=false but still records them", async () => {
    const { db } = makeDb();
    const result = await caller(user(), db).attendance.import({
      ...base,
      participants: [{ email: "aarav@x.edu", durationMinutes: 12 }],
    });

    expect(result.matched[0]).toMatchObject({ minutes: 12, attended: false });
    expect(result.counts.present).toBe(0);
    expect(result.counts.belowThreshold).toBe(1);
  });

  it("prefers the strongest evidence when a person matches two ways", async () => {
    const { db } = makeDb();
    const result = await caller(user(), db).attendance.import({
      ...base,
      participants: [
        { name: "Aarav Sharma", durationMinutes: 10 },
        { email: "aarav@x.edu", durationMinutes: 10 },
      ],
    });

    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]?.matchedBy).toBe("email");
  });
});

describe("attendance.import write behaviour", () => {
  it("writes nothing on a dry run", async () => {
    const { db, tx } = makeDb();
    await caller(user(), db).attendance.import({
      ...base,
      participants: [{ email: "aarav@x.edu", durationMinutes: 50 }],
    });

    expect(db.$transaction).not.toHaveBeenCalled();
    expect(tx.attendance.createMany).not.toHaveBeenCalled();
  });

  /**
   * `postAttendance` used `createMany` against a unique (username, classId)
   * with no conflict handling, so re-importing threw. Reconciling means
   * re-importing, so overwrite is the default.
   */
  it("deletes the rows it is about to replace", async () => {
    const { db, tx } = makeDb();
    await caller(user(), db).attendance.import({
      classId: CLASS,
      minimumMinutes: 40,
      dryRun: false,
      overwriteExisting: true,
      participants: [{ email: "aarav@x.edu", durationMinutes: 50 }],
    });

    expect(tx.attendance.deleteMany).toHaveBeenCalledWith({
      where: { classId: CLASS, username: { in: ["21CS001"] } },
    });
    expect(tx.attendance.createMany).toHaveBeenCalledOnce();
  });

  it("skips duplicates instead of deleting when overwrite is off", async () => {
    const { db, tx } = makeDb();
    await caller(user(), db).attendance.import({
      classId: CLASS,
      minimumMinutes: 40,
      dryRun: false,
      overwriteExisting: false,
      participants: [{ email: "aarav@x.edu", durationMinutes: 50 }],
    });

    expect(tx.attendance.deleteMany).not.toHaveBeenCalled();
    expect(tx.attendance.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
  });

  it("refuses to commit when nothing matched", async () => {
    const { db } = makeDb();
    expect(
      await codeOf(() =>
        caller(user(), db).attendance.import({
          classId: CLASS,
          minimumMinutes: 40,
          dryRun: false,
          participants: [{ name: "Nobody At All", durationMinutes: 50 }],
        }),
      ),
    ).toBe("BAD_REQUEST");
  });

  it("errors when the course has no enrolments", async () => {
    const { db } = makeDb([]);
    expect(
      await codeOf(() =>
        caller(user(), db).attendance.import({
          ...base,
          participants: [{ email: "a@x.edu", durationMinutes: 50 }],
        }),
      ),
    ).toBe("BAD_REQUEST");
  });
});

describe("attendance authorization", () => {
  // attendance:create is INSTRUCTOR+; MENTOR holds only read/list.
  it("denies a mentor importing", async () => {
    const { db } = makeDb();
    expect(
      await codeOf(() =>
        caller(user("MENTOR"), db).attendance.import({
          ...base,
          participants: [{ email: "aarav@x.edu", durationMinutes: 50 }],
        }),
      ),
    ).toBe("FORBIDDEN");
  });

  it("denies a student importing", async () => {
    const { db } = makeDb();
    expect(
      await codeOf(() =>
        caller(user("STUDENT"), db).attendance.import({
          ...base,
          participants: [{ email: "aarav@x.edu", durationMinutes: 50 }],
        }),
      ),
    ).toBe("FORBIDDEN");
  });

  it("denies a mentor clearing attendance", async () => {
    const { db } = makeDb();
    expect(
      await codeOf(() =>
        caller(user("MENTOR"), db).attendance.clear({
          classId: CLASS,
          dryRun: true,
        }),
      ),
    ).toBe("FORBIDDEN");
  });

  it("previews a clear without deleting", async () => {
    const { db } = makeDb();
    db.attendance.count = vi.fn().mockResolvedValue(30);

    const result = await caller(user(), db).attendance.clear({
      classId: CLASS,
      dryRun: true,
    });

    expect(result).toEqual({ dryRun: true, wouldDelete: 30 });
    expect(db.attendance.deleteMany).not.toHaveBeenCalled();
  });
});
