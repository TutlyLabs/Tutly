import { z } from "zod";

import type { Db } from "@tutly/db";

/**
 * Structured, allowlisted query interface for the natural-language data
 * assistant. The model picks values from a fixed vocabulary; it never authors
 * code. Everything reachable from here is read-only and organization-scoped by
 * construction — see `compileQuery`.
 */

// ─── Field / model allowlist ──────────────────────────────────────────────────

type FieldType = "string" | "int" | "boolean" | "datetime" | "enum";

interface FieldDef {
  type: FieldType;
  /** Permitted literals when `type` is "enum". */
  values?: readonly string[];
}

export type AllowedModel =
  | "user"
  | "course"
  | "enrolledUsers"
  | "class"
  | "attachment"
  | "submission"
  | "point"
  | "attendance"
  | "doubt"
  | "response";

interface RelationDef {
  model: AllowedModel;
  /** true for to-many relations, false for to-one. */
  list: boolean;
}

interface ModelDef {
  /** Selectable and filterable scalars. Anything absent here is unreachable. */
  fields: Record<string, FieldDef>;
  relations: Record<string, RelationDef>;
  /** Fields used when the caller does not name any. */
  defaultSelect: readonly string[];
  /**
   * Prisma `where` fragment binding every row of this model to one
   * organization. Applied unconditionally by the compiler.
   */
  tenancy: (organizationId: string) => Record<string, unknown>;
  description: string;
}

const ROLE = ["INSTRUCTOR", "MENTOR", "STUDENT", "ADMIN", "SUPER_ADMIN"] as const;

const str: FieldDef = { type: "string" };
const int: FieldDef = { type: "int" };
const bool: FieldDef = { type: "boolean" };
const date: FieldDef = { type: "datetime" };

/**
 * Tenancy for models that reach Organization only through a relation. `Course`
 * has no `organizationId`; its owner does. Models with no unambiguous path to
 * an organization are simply absent from this table.
 */
const MODELS: Record<AllowedModel, ModelDef> = {
  user: {
    description: "A person in the organization (student, mentor, instructor, admin).",
    fields: {
      id: str,
      name: str,
      username: str,
      email: str,
      image: str,
      mobile: str,
      role: { type: "enum", values: ROLE },
      organizationId: str,
      lastSeen: date,
      isEmailVerified: bool,
      isProfilePublic: bool,
      isAdmin: bool,
      disabledAt: date,
      banned: bool,
      createdAt: date,
      updatedAt: date,
    },
    relations: {
      course: { model: "course", list: true },
      enrolledUsers: { model: "enrolledUsers", list: true },
      assignedMentees: { model: "enrolledUsers", list: true },
      doubt: { model: "doubt", list: true },
      response: { model: "response", list: true },
      Attendence: { model: "attendance", list: true },
    },
    defaultSelect: ["id", "name", "username", "email", "role"],
    tenancy: (organizationId) => ({ organizationId }),
  },
  course: {
    description: "A course. `createdBy` is the owning instructor.",
    fields: {
      id: str,
      title: str,
      slug: str,
      image: str,
      startDate: date,
      endDate: date,
      isPublished: bool,
      createdById: str,
      createdAt: date,
      updatedAt: date,
    },
    relations: {
      createdBy: { model: "user", list: false },
      enrolledUsers: { model: "enrolledUsers", list: true },
      classes: { model: "class", list: true },
      attachments: { model: "attachment", list: true },
      doubts: { model: "doubt", list: true },
    },
    defaultSelect: ["id", "title", "isPublished", "startDate"],
    tenancy: (organizationId) => ({ createdBy: { organizationId } }),
  },
  enrolledUsers: {
    description:
      "One person's enrolment in one course. `mentorUsername` is their assigned mentor.",
    fields: {
      id: str,
      username: str,
      mentorUsername: str,
      startDate: date,
      endDate: date,
      courseId: str,
      createdAt: date,
      updatedAt: date,
    },
    relations: {
      user: { model: "user", list: false },
      mentor: { model: "user", list: false },
      course: { model: "course", list: false },
      submission: { model: "submission", list: true },
    },
    defaultSelect: ["id", "username", "mentorUsername", "courseId"],
    tenancy: (organizationId) => ({ user: { organizationId } }),
  },
  class: {
    description: "A class session within a course.",
    fields: {
      id: str,
      title: str,
      courseId: str,
      videoId: str,
      folderId: str,
      classType: { type: "enum", values: ["RECORDED", "LIVE"] },
      liveProvider: { type: "enum", values: ["ZOOM", "GOOGLE_MEET"] },
      startTime: date,
      endTime: date,
      createdAt: date,
      updatedAt: date,
    },
    relations: {
      course: { model: "course", list: false },
      Attendence: { model: "attendance", list: true },
      attachments: { model: "attachment", list: true },
    },
    defaultSelect: ["id", "title", "classType", "startTime", "courseId"],
    tenancy: (organizationId) => ({ course: { createdBy: { organizationId } } }),
  },
  attachment: {
    description: "An assignment or attached resource on a course or class.",
    fields: {
      id: str,
      title: str,
      details: str,
      attachmentType: {
        type: "enum",
        values: ["ASSIGNMENT", "GITHUB", "ZOOM", "OTHERS"],
      },
      link: str,
      maxSubmissions: int,
      classId: str,
      courseId: str,
      submissionMode: {
        type: "enum",
        values: [
          "HTML_CSS_JS",
          "REACT",
          "EXTERNAL_LINK",
          "SANDBOX",
          "WORKSPACE",
          "GIT",
        ],
      },
      dueDate: date,
      createdAt: date,
      updatedAt: date,
    },
    relations: {
      course: { model: "course", list: false },
      class: { model: "class", list: false },
      submissions: { model: "submission", list: true },
    },
    defaultSelect: ["id", "title", "attachmentType", "dueDate", "courseId"],
    tenancy: (organizationId) => ({ course: { createdBy: { organizationId } } }),
  },
  submission: {
    description: "A student's submission for an assignment.",
    fields: {
      id: str,
      enrolledUserId: str,
      attachmentId: str,
      overallFeedback: str,
      submissionLink: str,
      submissionDate: date,
      status: { type: "enum", values: ["IN_PROGRESS", "SUBMITTED"] },
      createdAt: date,
      updatedAt: date,
    },
    relations: {
      enrolledUser: { model: "enrolledUsers", list: false },
      assignment: { model: "attachment", list: false },
      points: { model: "point", list: true },
    },
    defaultSelect: ["id", "status", "submissionDate", "attachmentId"],
    tenancy: (organizationId) => ({
      enrolledUser: { user: { organizationId } },
    }),
  },
  point: {
    description: "A score awarded on a submission, in one category.",
    fields: {
      id: str,
      category: {
        type: "enum",
        values: ["RESPOSIVENESS", "STYLING", "OTHER", "TESTS"],
      },
      feedback: str,
      score: int,
      maxScore: int,
      source: str,
      submissionId: str,
      createdAt: date,
      updatedAt: date,
    },
    relations: {
      submissions: { model: "submission", list: false },
    },
    defaultSelect: ["id", "category", "score", "maxScore", "submissionId"],
    tenancy: (organizationId) => ({
      submissions: { enrolledUser: { user: { organizationId } } },
    }),
  },
  attendance: {
    description: "Whether a person attended a class.",
    fields: {
      id: str,
      username: str,
      classId: str,
      attendedDuration: int,
      attended: bool,
      createdAt: date,
      updatedAt: date,
    },
    relations: {
      user: { model: "user", list: false },
      class: { model: "class", list: false },
    },
    defaultSelect: ["id", "username", "classId", "attended"],
    tenancy: (organizationId) => ({ user: { organizationId } }),
  },
  doubt: {
    description: "A question raised by a person, optionally against a course.",
    fields: {
      id: str,
      title: str,
      description: str,
      userId: str,
      courseId: str,
      createdAt: date,
      updatedAt: date,
    },
    relations: {
      user: { model: "user", list: false },
      course: { model: "course", list: false },
      response: { model: "response", list: true },
    },
    defaultSelect: ["id", "title", "userId", "courseId", "createdAt"],
    tenancy: (organizationId) => ({ user: { organizationId } }),
  },
  response: {
    description: "A reply to a doubt.",
    fields: {
      id: str,
      description: str,
      userId: str,
      doubtId: str,
      createdAt: date,
      updatedAt: date,
    },
    relations: {
      user: { model: "user", list: false },
      doubt: { model: "doubt", list: false },
    },
    defaultSelect: ["id", "description", "userId", "doubtId"],
    tenancy: (organizationId) => ({ user: { organizationId } }),
  },
};

export const ALLOWED_MODELS = Object.keys(MODELS) as [
  AllowedModel,
  ...AllowedModel[],
];

const modelDef = (model: AllowedModel): ModelDef => MODELS[model];

// ─── DSL schema ───────────────────────────────────────────────────────────────

export const MAX_TAKE = 100;
const DEFAULT_TAKE = 25;
const MAX_RELATION_TAKE = 25;

const OPERATIONS = ["findMany", "findFirst", "count", "aggregate"] as const;
export type Operation = (typeof OPERATIONS)[number];

const OPERATORS = [
  "equals",
  "not",
  "in",
  "notIn",
  "lt",
  "lte",
  "gt",
  "gte",
  "contains",
  "startsWith",
  "endsWith",
  "isNull",
  "isNotNull",
] as const;
type Operator = (typeof OPERATORS)[number];

const RELATION_MODES = ["some", "every", "none", "is", "isNot"] as const;

/**
 * Values arrive as strings and are coerced against the declared field type, so
 * the DSL stays expressible as a flat JSON schema for the model to fill in.
 */
const fieldConditionSchema = z.object({
  field: z.string(),
  op: z.enum(OPERATORS),
  value: z.string().optional(),
  values: z.array(z.string()).optional(),
});

const relationConditionSchema = z.object({
  relation: z.string(),
  mode: z.enum(RELATION_MODES),
  conditions: z.array(fieldConditionSchema).max(10),
});

/** Deliberately non-recursive: one combinator over leaf and relation predicates. */
const whereSchema = z.object({
  combinator: z.enum(["AND", "OR"]).default("AND"),
  conditions: z.array(fieldConditionSchema).max(10).default([]),
  relationConditions: z.array(relationConditionSchema).max(5).default([]),
});

const includeSchema = z.object({
  relation: z.string(),
  select: z.array(z.string()).max(20).optional(),
  take: z.number().int().positive().optional(),
});

export const queryDslSchema = z.object({
  model: z.enum(ALLOWED_MODELS),
  operation: z.enum(OPERATIONS),
  select: z.array(z.string()).max(30).optional(),
  include: z.array(includeSchema).max(5).optional(),
  countRelations: z.array(z.string()).max(5).optional(),
  where: whereSchema.optional(),
  orderBy: z
    .array(z.object({ field: z.string(), direction: z.enum(["asc", "desc"]) }))
    .max(3)
    .optional(),
  take: z.number().int().positive().optional(),
  aggregate: z
    .object({
      count: z.boolean().optional(),
      avg: z.array(z.string()).max(5).optional(),
      sum: z.array(z.string()).max(5).optional(),
      min: z.array(z.string()).max(5).optional(),
      max: z.array(z.string()).max(5).optional(),
    })
    .optional(),
});

export type QueryDsl = z.infer<typeof queryDslSchema>;

/** Rejection reason for a query the allowlist cannot express. */
export class QueryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QueryValidationError";
  }
}

// ─── Compiler ─────────────────────────────────────────────────────────────────

export interface CompiledQuery {
  model: AllowedModel;
  operation: Operation;
  args: Record<string, unknown>;
}

function requireField(def: ModelDef, model: string, name: string): FieldDef {
  const field = def.fields[name];
  if (!field) {
    throw new QueryValidationError(
      `Field "${name}" is not selectable on "${model}".`,
    );
  }
  return field;
}

function requireRelation(
  def: ModelDef,
  model: string,
  name: string,
): RelationDef {
  const relation = def.relations[name];
  if (!relation) {
    throw new QueryValidationError(
      `Relation "${name}" is not available on "${model}".`,
    );
  }
  return relation;
}

function coerce(field: FieldDef, name: string, raw: string): unknown {
  switch (field.type) {
    case "string":
      return raw;
    case "enum": {
      const match = field.values?.find(
        (v) => v.toLowerCase() === raw.trim().toLowerCase(),
      );
      if (!match) {
        throw new QueryValidationError(
          `"${raw}" is not a valid value for "${name}".`,
        );
      }
      return match;
    }
    case "int": {
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        throw new QueryValidationError(`"${name}" expects a number.`);
      }
      return n;
    }
    case "boolean": {
      const v = raw.trim().toLowerCase();
      if (v !== "true" && v !== "false") {
        throw new QueryValidationError(`"${name}" expects true or false.`);
      }
      return v === "true";
    }
    case "datetime": {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) {
        throw new QueryValidationError(`"${name}" expects a date.`);
      }
      return d;
    }
  }
}

const ORDERED_TYPES = new Set<FieldType>(["int", "datetime"]);

function compileFieldCondition(
  def: ModelDef,
  model: string,
  c: z.infer<typeof fieldConditionSchema>,
): Record<string, unknown> {
  const field = requireField(def, model, c.field);
  const op: Operator = c.op;

  if (op === "isNull") return { [c.field]: { equals: null } };
  if (op === "isNotNull") return { [c.field]: { not: null } };

  if (op === "in" || op === "notIn") {
    const values = c.values ?? (c.value === undefined ? [] : [c.value]);
    if (values.length === 0) {
      throw new QueryValidationError(`"${op}" on "${c.field}" needs values.`);
    }
    return {
      [c.field]: { [op]: values.map((v) => coerce(field, c.field, v)) },
    };
  }

  if (c.value === undefined) {
    throw new QueryValidationError(`"${op}" on "${c.field}" needs a value.`);
  }

  if (op === "contains" || op === "startsWith" || op === "endsWith") {
    if (field.type !== "string") {
      throw new QueryValidationError(
        `"${op}" only applies to text fields, not "${c.field}".`,
      );
    }
    return { [c.field]: { [op]: c.value, mode: "insensitive" } };
  }

  if (
    (op === "lt" || op === "lte" || op === "gt" || op === "gte") &&
    !ORDERED_TYPES.has(field.type)
  ) {
    throw new QueryValidationError(
      `"${op}" only applies to numeric or date fields, not "${c.field}".`,
    );
  }

  return { [c.field]: { [op]: coerce(field, c.field, c.value) } };
}

function compileWhereGroup(
  def: ModelDef,
  model: string,
  group: z.infer<typeof whereSchema>,
): Record<string, unknown> {
  const parts: Record<string, unknown>[] = group.conditions.map((c) =>
    compileFieldCondition(def, model, c),
  );

  for (const rc of group.relationConditions) {
    const relation = requireRelation(def, model, rc.relation);
    const listMode = rc.mode === "some" || rc.mode === "every" || rc.mode === "none";
    if (relation.list !== listMode) {
      throw new QueryValidationError(
        `"${rc.mode}" cannot be used on relation "${rc.relation}".`,
      );
    }
    const relDef = modelDef(relation.model);
    const inner = rc.conditions.map((c) =>
      compileFieldCondition(relDef, relation.model, c),
    );
    parts.push({ [rc.relation]: { [rc.mode]: { AND: inner } } });
  }

  if (parts.length === 0) return {};
  return group.combinator === "OR" ? { OR: parts } : { AND: parts };
}

function compileSelect(
  def: ModelDef,
  model: string,
  dsl: QueryDsl,
  organizationId: string,
): Record<string, unknown> {
  const select: Record<string, unknown> = {};

  const scalars =
    dsl.select && dsl.select.length > 0 ? dsl.select : def.defaultSelect;
  for (const name of scalars) {
    requireField(def, model, name);
    select[name] = true;
  }

  for (const inc of dsl.include ?? []) {
    const relation = requireRelation(def, model, inc.relation);
    const relDef = modelDef(relation.model);
    const relScalars =
      inc.select && inc.select.length > 0 ? inc.select : relDef.defaultSelect;
    const relSelect: Record<string, unknown> = {};
    for (const name of relScalars) {
      requireField(relDef, relation.model, name);
      relSelect[name] = true;
    }
    select[inc.relation] = relation.list
      ? {
          // Included rows are scoped independently: a row reachable from an
          // in-org parent is not necessarily in-org itself.
          where: relDef.tenancy(organizationId),
          select: relSelect,
          take: Math.min(inc.take ?? MAX_RELATION_TAKE, MAX_RELATION_TAKE),
        }
      : { select: relSelect };
  }

  const countRelations = dsl.countRelations ?? [];
  if (countRelations.length > 0) {
    const counts: Record<string, unknown> = {};
    for (const name of countRelations) {
      const relation = requireRelation(def, model, name);
      if (!relation.list) {
        throw new QueryValidationError(
          `Relation "${name}" is single-valued and cannot be counted.`,
        );
      }
      counts[name] = true;
    }
    select._count = { select: counts };
  }

  if (Object.keys(select).length === 0) {
    throw new QueryValidationError("Query selects no fields.");
  }
  return select;
}

function compileOrderBy(
  def: ModelDef,
  model: string,
  dsl: QueryDsl,
): Record<string, unknown>[] | undefined {
  if (!dsl.orderBy || dsl.orderBy.length === 0) return undefined;
  return dsl.orderBy.map((o) => {
    requireField(def, model, o.field);
    return { [o.field]: o.direction };
  });
}

function compileAggregate(
  def: ModelDef,
  model: string,
  dsl: QueryDsl,
): Record<string, unknown> {
  const spec = dsl.aggregate ?? { count: true };
  const args: Record<string, unknown> = {};
  if (spec.count !== false) args._count = true;

  for (const [key, fields] of [
    ["_avg", spec.avg],
    ["_sum", spec.sum],
    ["_min", spec.min],
    ["_max", spec.max],
  ] as const) {
    if (!fields || fields.length === 0) continue;
    const entry: Record<string, true> = {};
    for (const name of fields) {
      const field = requireField(def, model, name);
      if (field.type !== "int") {
        throw new QueryValidationError(
          `"${name}" is not numeric and cannot be aggregated.`,
        );
      }
      entry[name] = true;
    }
    args[key] = entry;
  }
  return args;
}

/**
 * Turns a validated DSL into Prisma arguments. The organization filter is
 * prepended to `where` here rather than requested from the model, so no DSL
 * input can omit, widen or override it.
 */
export function compileQuery(
  dsl: QueryDsl,
  organizationId: string,
): CompiledQuery {
  if (!organizationId) {
    throw new QueryValidationError(
      "Your account is not attached to an organization.",
    );
  }

  const def = modelDef(dsl.model);
  const tenancy = def.tenancy(organizationId);
  const userWhere = dsl.where
    ? compileWhereGroup(def, dsl.model, dsl.where)
    : {};
  const where =
    Object.keys(userWhere).length > 0
      ? { AND: [tenancy, userWhere] }
      : { AND: [tenancy] };

  const args: Record<string, unknown> = { where };
  const orderBy = compileOrderBy(def, dsl.model, dsl);

  switch (dsl.operation) {
    case "count":
      if (orderBy) args.orderBy = orderBy;
      break;
    case "aggregate":
      Object.assign(args, compileAggregate(def, dsl.model, dsl));
      if (orderBy) args.orderBy = orderBy;
      break;
    case "findFirst":
      args.select = compileSelect(def, dsl.model, dsl, organizationId);
      if (orderBy) args.orderBy = orderBy;
      break;
    case "findMany":
      args.select = compileSelect(def, dsl.model, dsl, organizationId);
      if (orderBy) args.orderBy = orderBy;
      args.take = Math.min(dsl.take ?? DEFAULT_TAKE, MAX_TAKE);
      break;
  }

  return { model: dsl.model, operation: dsl.operation, args };
}

// ─── Execution ────────────────────────────────────────────────────────────────

type PrismaArgs = Record<string, unknown>;

/**
 * Prisma generates a distinct argument type per model and cannot describe a
 * builder whose keys are chosen at runtime. Every key and value reaching here
 * originates from the allowlist tables above, so the shape is valid by
 * construction; this function is the single place that assertion is made.
 */
function args<T>(value: PrismaArgs): T {
  return value as unknown as T;
}

/**
 * Static map of read-only delegates. Model names are never used for property
 * lookup on the Prisma client — each entry is written out here, so an operation
 * that is not a read cannot be reached at all.
 */
const RUNNERS: Record<
  AllowedModel,
  Record<Operation, (db: Db, a: PrismaArgs) => Promise<unknown>>
> = {
  user: {
    findMany: (db, a) => db.user.findMany(args(a)),
    findFirst: (db, a) => db.user.findFirst(args(a)),
    count: (db, a) => db.user.count(args(a)),
    aggregate: (db, a) => db.user.aggregate(args<Parameters<typeof db.user.aggregate>[0]>(a)),
  },
  course: {
    findMany: (db, a) => db.course.findMany(args(a)),
    findFirst: (db, a) => db.course.findFirst(args(a)),
    count: (db, a) => db.course.count(args(a)),
    aggregate: (db, a) => db.course.aggregate(args<Parameters<typeof db.course.aggregate>[0]>(a)),
  },
  enrolledUsers: {
    findMany: (db, a) => db.enrolledUsers.findMany(args(a)),
    findFirst: (db, a) => db.enrolledUsers.findFirst(args(a)),
    count: (db, a) => db.enrolledUsers.count(args(a)),
    aggregate: (db, a) => db.enrolledUsers.aggregate(args<Parameters<typeof db.enrolledUsers.aggregate>[0]>(a)),
  },
  class: {
    findMany: (db, a) => db.class.findMany(args(a)),
    findFirst: (db, a) => db.class.findFirst(args(a)),
    count: (db, a) => db.class.count(args(a)),
    aggregate: (db, a) => db.class.aggregate(args<Parameters<typeof db.class.aggregate>[0]>(a)),
  },
  attachment: {
    findMany: (db, a) => db.attachment.findMany(args(a)),
    findFirst: (db, a) => db.attachment.findFirst(args(a)),
    count: (db, a) => db.attachment.count(args(a)),
    aggregate: (db, a) => db.attachment.aggregate(args<Parameters<typeof db.attachment.aggregate>[0]>(a)),
  },
  submission: {
    findMany: (db, a) => db.submission.findMany(args(a)),
    findFirst: (db, a) => db.submission.findFirst(args(a)),
    count: (db, a) => db.submission.count(args(a)),
    aggregate: (db, a) => db.submission.aggregate(args<Parameters<typeof db.submission.aggregate>[0]>(a)),
  },
  point: {
    findMany: (db, a) => db.point.findMany(args(a)),
    findFirst: (db, a) => db.point.findFirst(args(a)),
    count: (db, a) => db.point.count(args(a)),
    aggregate: (db, a) => db.point.aggregate(args<Parameters<typeof db.point.aggregate>[0]>(a)),
  },
  attendance: {
    findMany: (db, a) => db.attendance.findMany(args(a)),
    findFirst: (db, a) => db.attendance.findFirst(args(a)),
    count: (db, a) => db.attendance.count(args(a)),
    aggregate: (db, a) => db.attendance.aggregate(args<Parameters<typeof db.attendance.aggregate>[0]>(a)),
  },
  doubt: {
    findMany: (db, a) => db.doubt.findMany(args(a)),
    findFirst: (db, a) => db.doubt.findFirst(args(a)),
    count: (db, a) => db.doubt.count(args(a)),
    aggregate: (db, a) => db.doubt.aggregate(args<Parameters<typeof db.doubt.aggregate>[0]>(a)),
  },
  response: {
    findMany: (db, a) => db.response.findMany(args(a)),
    findFirst: (db, a) => db.response.findFirst(args(a)),
    count: (db, a) => db.response.count(args(a)),
    aggregate: (db, a) => db.response.aggregate(args<Parameters<typeof db.response.aggregate>[0]>(a)),
  },
};

export function runCompiledQuery(
  db: Db,
  compiled: CompiledQuery,
): Promise<unknown> {
  return RUNNERS[compiled.model][compiled.operation](db, compiled.args);
}

// ─── Prompt / response-schema generation ──────────────────────────────────────

/** Human-readable catalogue of everything the DSL can reach, for the prompt. */
export function describeAllowlist(): string {
  return ALLOWED_MODELS.map((model) => {
    const def = modelDef(model);
    const fields = Object.entries(def.fields)
      .map(([name, f]) =>
        f.type === "enum" ? `${name}:${f.values?.join("|")}` : `${name}:${f.type}`,
      )
      .join(", ");
    const relations = Object.entries(def.relations)
      .map(([name, r]) => `${name} -> ${r.model}${r.list ? "[]" : ""}`)
      .join(", ");
    return `${model} — ${def.description}\n  fields: ${fields}\n  relations: ${relations}`;
  }).join("\n\n");
}

/**
 * Gemini `responseSchema` (OpenAPI subset) mirroring `queryDslSchema`. Field
 * names stay free-form strings here and are checked against the allowlist
 * during compilation, since valid names depend on the chosen model.
 */
export function geminiResponseSchema(): Record<string, unknown> {
  const fieldCondition = {
    type: "object",
    properties: {
      field: { type: "string" },
      op: { type: "string", enum: [...OPERATORS] },
      value: { type: "string" },
      values: { type: "array", items: { type: "string" } },
    },
    required: ["field", "op"],
  };

  return {
    type: "object",
    properties: {
      model: { type: "string", enum: [...ALLOWED_MODELS] },
      operation: { type: "string", enum: [...OPERATIONS] },
      select: { type: "array", items: { type: "string" } },
      include: {
        type: "array",
        items: {
          type: "object",
          properties: {
            relation: { type: "string" },
            select: { type: "array", items: { type: "string" } },
            take: { type: "integer" },
          },
          required: ["relation"],
        },
      },
      countRelations: { type: "array", items: { type: "string" } },
      where: {
        type: "object",
        properties: {
          combinator: { type: "string", enum: ["AND", "OR"] },
          conditions: { type: "array", items: fieldCondition },
          relationConditions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                relation: { type: "string" },
                mode: { type: "string", enum: [...RELATION_MODES] },
                conditions: { type: "array", items: fieldCondition },
              },
              required: ["relation", "mode", "conditions"],
            },
          },
        },
      },
      orderBy: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: { type: "string" },
            direction: { type: "string", enum: ["asc", "desc"] },
          },
          required: ["field", "direction"],
        },
      },
      take: { type: "integer" },
      aggregate: {
        type: "object",
        properties: {
          count: { type: "boolean" },
          avg: { type: "array", items: { type: "string" } },
          sum: { type: "array", items: { type: "string" } },
          min: { type: "array", items: { type: "string" } },
          max: { type: "array", items: { type: "string" } },
        },
      },
    },
    required: ["model", "operation"],
  };
}
