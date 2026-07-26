import { describe, expect, it } from "vitest";

import type { Db } from "@tutly/db";

import type { AllowedModel, Operation, QueryDsl } from "./aiQueryDsl";
import {
  ALLOWED_MODELS,
  compileQuery,
  describeAllowlist,
  geminiResponseSchema,
  MAX_TAKE,
  QueryValidationError,
  queryDslSchema,
  runCompiledQuery,
} from "./aiQueryDsl";

const ORG = "org-1";
const OPERATIONS: Operation[] = ["findMany", "findFirst", "count", "aggregate"];

/**
 * Restated independently of the implementation: if a scope changes, this test
 * should fail and force a deliberate review of the tenancy path.
 */
const EXPECTED_TENANCY: Record<AllowedModel, unknown> = {
  user: { organizationId: ORG },
  course: { createdBy: { organizationId: ORG } },
  enrolledUsers: { user: { organizationId: ORG } },
  class: { course: { createdBy: { organizationId: ORG } } },
  attachment: { course: { createdBy: { organizationId: ORG } } },
  submission: { enrolledUser: { user: { organizationId: ORG } } },
  point: { submissions: { enrolledUser: { user: { organizationId: ORG } } } },
  attendance: { user: { organizationId: ORG } },
  doubt: { user: { organizationId: ORG } },
  response: { user: { organizationId: ORG } },
};

function whereOf(args: Record<string, unknown>): { AND: unknown[] } {
  return args.where as { AND: unknown[] };
}

function parse(raw: unknown): QueryDsl {
  const result = queryDslSchema.safeParse(raw);
  if (!result.success) throw new Error(`did not parse: ${result.error.message}`);
  return result.data;
}

interface RecordedCall {
  model: string;
  operation: string;
  args: unknown;
}

/** Minimal stand-in for the Prisma client: records the delegate that was hit. */
function fakeDb(calls: RecordedCall[], result: unknown = []): Db {
  const delegate = (model: string) =>
    Object.fromEntries(
      OPERATIONS.map((operation) => [
        operation,
        (args: unknown) => {
          calls.push({ model, operation, args });
          return Promise.resolve(result);
        },
      ]),
    );
  return Object.fromEntries(
    ALLOWED_MODELS.map((model) => [model, delegate(model)]),
  ) as unknown as Db;
}

describe("query DSL validation", () => {
  it("rejects a response that is not a query object at all", () => {
    expect(queryDslSchema.safeParse({ text: "here you go" }).success).toBe(
      false,
    );
    expect(queryDslSchema.safeParse("db.user.findMany()").success).toBe(false);
    expect(queryDslSchema.safeParse(null).success).toBe(false);
  });

  it("rejects a model outside the allowlist", () => {
    for (const model of ["account", "session", "organization", "profile"]) {
      expect(
        queryDslSchema.safeParse({ model, operation: "findMany" }).success,
      ).toBe(false);
    }
  });

  it("rejects every mutation verb by construction", () => {
    for (const operation of [
      "create",
      "createMany",
      "update",
      "updateMany",
      "upsert",
      "delete",
      "deleteMany",
      "executeRaw",
      "queryRaw",
    ]) {
      expect(
        queryDslSchema.safeParse({ model: "user", operation }).success,
      ).toBe(false);
    }
  });

  it("rejects an unknown filter operator", () => {
    expect(
      queryDslSchema.safeParse({
        model: "user",
        operation: "findMany",
        where: { conditions: [{ field: "id", op: "sql" }] },
      }).success,
    ).toBe(false);
  });
});

describe("tenancy enforcement", () => {
  it("scopes every model and every operation, even with no where clause", () => {
    for (const model of ALLOWED_MODELS) {
      for (const operation of OPERATIONS) {
        const compiled = compileQuery(parse({ model, operation }), ORG);
        expect(whereOf(compiled.args).AND[0]).toEqual(EXPECTED_TENANCY[model]);
      }
    }
  });

  it("keeps the scope when the planner supplies its own where clause", () => {
    const compiled = compileQuery(
      parse({
        model: "user",
        operation: "findMany",
        where: {
          combinator: "OR",
          conditions: [{ field: "role", op: "equals", value: "STUDENT" }],
        },
      }),
      ORG,
    );
    const where = whereOf(compiled.args);
    expect(where.AND[0]).toEqual(EXPECTED_TENANCY.user);
    expect(where.AND[1]).toEqual({ OR: [{ role: { equals: "STUDENT" } }] });
  });

  it("cannot be widened by a planner-supplied organizationId filter", () => {
    const compiled = compileQuery(
      parse({
        model: "user",
        operation: "findMany",
        where: {
          combinator: "OR",
          conditions: [
            { field: "organizationId", op: "equals", value: "other-org" },
            { field: "organizationId", op: "isNull" },
          ],
        },
      }),
      ORG,
    );
    // The planner's OR sits inside the AND, so the org filter still applies.
    const where = whereOf(compiled.args);
    expect(where.AND[0]).toEqual({ organizationId: ORG });
    expect(where.AND).toHaveLength(2);
  });

  it("scopes included to-many relations independently of the parent", () => {
    const compiled = compileQuery(
      parse({
        model: "course",
        operation: "findMany",
        select: ["id", "title"],
        include: [{ relation: "enrolledUsers", select: ["username"] }],
      }),
      ORG,
    );
    const select = compiled.args.select as Record<string, unknown>;
    expect(select.enrolledUsers).toEqual({
      where: EXPECTED_TENANCY.enrolledUsers,
      select: { username: true },
      take: 25,
    });
  });

  it("refuses to compile without an organization", () => {
    expect(() =>
      compileQuery(parse({ model: "user", operation: "findMany" }), ""),
    ).toThrow(QueryValidationError);
  });
});

describe("field allowlist", () => {
  it("rejects sensitive and unknown fields in select", () => {
    for (const field of [
      "oneTimePassword",
      "password",
      "accessToken",
      "banReason",
    ]) {
      expect(() =>
        compileQuery(
          parse({ model: "user", operation: "findMany", select: [field] }),
          ORG,
        ),
      ).toThrow(QueryValidationError);
    }
  });

  it("rejects unknown fields in where and orderBy", () => {
    expect(() =>
      compileQuery(
        parse({
          model: "user",
          operation: "findMany",
          where: {
            conditions: [
              { field: "oneTimePassword", op: "equals", value: "x" },
            ],
          },
        }),
        ORG,
      ),
    ).toThrow(QueryValidationError);

    expect(() =>
      compileQuery(
        parse({
          model: "class",
          operation: "findMany",
          orderBy: [{ field: "meetingPasscode", direction: "asc" }],
        }),
        ORG,
      ),
    ).toThrow(QueryValidationError);
  });

  it("rejects unknown relations in include, countRelations and where", () => {
    expect(() =>
      compileQuery(
        parse({
          model: "user",
          operation: "findMany",
          include: [{ relation: "accounts" }],
        }),
        ORG,
      ),
    ).toThrow(QueryValidationError);

    expect(() =>
      compileQuery(
        parse({
          model: "user",
          operation: "findMany",
          countRelations: ["sessions"],
        }),
        ORG,
      ),
    ).toThrow(QueryValidationError);

    expect(() =>
      compileQuery(
        parse({
          model: "course",
          operation: "findMany",
          where: {
            relationConditions: [
              {
                relation: "notAThing",
                mode: "some",
                conditions: [{ field: "id", op: "equals", value: "x" }],
              },
            ],
          },
        }),
        ORG,
      ),
    ).toThrow(QueryValidationError);
  });

  it("rejects values that do not fit the field's type", () => {
    expect(() =>
      compileQuery(
        parse({
          model: "user",
          operation: "findMany",
          where: {
            conditions: [{ field: "role", op: "equals", value: "ROOT" }],
          },
        }),
        ORG,
      ),
    ).toThrow(QueryValidationError);

    expect(() =>
      compileQuery(
        parse({
          model: "point",
          operation: "findMany",
          where: {
            conditions: [{ field: "score", op: "contains", value: "9" }],
          },
        }),
        ORG,
      ),
    ).toThrow(QueryValidationError);

    expect(() =>
      compileQuery(
        parse({
          model: "point",
          operation: "aggregate",
          aggregate: { avg: ["feedback"] },
        }),
        ORG,
      ),
    ).toThrow(QueryValidationError);
  });

  it("rejects a relation mode that does not match the relation's arity", () => {
    expect(() =>
      compileQuery(
        parse({
          model: "course",
          operation: "findMany",
          where: {
            relationConditions: [
              {
                relation: "createdBy",
                mode: "some",
                conditions: [{ field: "id", op: "equals", value: "u1" }],
              },
            ],
          },
        }),
        ORG,
      ),
    ).toThrow(QueryValidationError);
  });
});

describe("blast radius", () => {
  it("clamps take to the maximum", () => {
    const compiled = compileQuery(
      parse({ model: "user", operation: "findMany", take: 100000 }),
      ORG,
    );
    expect(compiled.args.take).toBe(MAX_TAKE);
  });

  it("clamps take on included relations", () => {
    const compiled = compileQuery(
      parse({
        model: "course",
        operation: "findMany",
        include: [{ relation: "enrolledUsers", take: 5000 }],
      }),
      ORG,
    );
    const select = compiled.args.select as Record<string, unknown>;
    expect((select.enrolledUsers as { take: number }).take).toBe(25);
  });

  it("never emits select or take for count", () => {
    const compiled = compileQuery(
      parse({
        model: "user",
        operation: "count",
        select: ["id"],
        take: 10,
      }),
      ORG,
    );
    expect(compiled.args.select).toBeUndefined();
    expect(compiled.args.take).toBeUndefined();
  });

  it("offers only read operations to the planner", () => {
    const schema = geminiResponseSchema();
    const properties = schema.properties as Record<
      string,
      { enum?: string[] }
    >;
    expect(properties.operation?.enum).toEqual([
      "findMany",
      "findFirst",
      "count",
      "aggregate",
    ]);
    expect(properties.model?.enum).toEqual([...ALLOWED_MODELS]);
  });

  it("never describes a sensitive field to the planner", () => {
    const description = describeAllowlist();
    for (const term of [
      "oneTimePassword",
      "accessToken",
      "refreshToken",
      "meetingPasscode",
      "sandboxTemplate",
      "hiddenTestFiles",
    ]) {
      expect(description).not.toContain(term);
    }
  });
});

describe("execution", () => {
  it("compiles and runs a realistic query", async () => {
    const calls: RecordedCall[] = [];
    const rows = [{ id: "c1", title: "React" }];
    const compiled = compileQuery(
      parse({
        model: "course",
        operation: "findMany",
        select: ["id", "title"],
        countRelations: ["enrolledUsers"],
        where: {
          conditions: [
            { field: "createdById", op: "equals", value: "u1" },
            { field: "isPublished", op: "equals", value: "true" },
          ],
        },
        orderBy: [{ field: "startDate", direction: "desc" }],
        take: 10,
      }),
      ORG,
    );

    expect(compiled.args).toEqual({
      where: {
        AND: [
          EXPECTED_TENANCY.course,
          {
            AND: [
              { createdById: { equals: "u1" } },
              { isPublished: { equals: true } },
            ],
          },
        ],
      },
      select: {
        id: true,
        title: true,
        _count: { select: { enrolledUsers: true } },
      },
      orderBy: [{ startDate: "desc" }],
      take: 10,
    });

    await expect(runCompiledQuery(fakeDb(calls, rows), compiled)).resolves.toEqual(
      rows,
    );
    expect(calls).toEqual([
      { model: "course", operation: "findMany", args: compiled.args },
    ]);
  });

  it("dispatches each model to its own delegate", async () => {
    const calls: RecordedCall[] = [];
    const db = fakeDb(calls);
    for (const model of ALLOWED_MODELS) {
      await runCompiledQuery(
        db,
        compileQuery(parse({ model, operation: "count" }), ORG),
      );
    }
    expect(calls.map((c) => c.model)).toEqual([...ALLOWED_MODELS]);
    expect(calls.every((c) => c.operation === "count")).toBe(true);
  });

  it("coerces dates and enum lists for the planner's string values", () => {
    const compiled = compileQuery(
      parse({
        model: "attachment",
        operation: "findMany",
        where: {
          conditions: [
            { field: "dueDate", op: "gte", value: "2024-01-15T00:00:00.000Z" },
            {
              field: "submissionMode",
              op: "in",
              values: ["react", "SANDBOX"],
            },
          ],
        },
      }),
      ORG,
    );
    expect(whereOf(compiled.args).AND[1]).toEqual({
      AND: [
        { dueDate: { gte: new Date("2024-01-15T00:00:00.000Z") } },
        { submissionMode: { in: ["REACT", "SANDBOX"] } },
      ],
    });
  });
});
