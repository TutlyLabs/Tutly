import type { AuthorizeResponse } from "better-auth/plugins/access";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

import type { Role as PrismaRole } from "@tutly/db/browser";

/**
 * The single source of truth for authorization in Tutly.
 *
 * Every resource/action pair below has at least one real call site; the list was
 * derived from an audit of all tRPC routers. better-auth's admin `defaultStatements`
 * are merged in so the admin plugin (set-role/ban/impersonate/...) keeps working
 * off the same access controller.
 *
 * Browser-safe: this module must never import a server-only runtime value.
 */
export const statement = {
  ...defaultStatements,
  // better-auth defaults plus Tutly's own user actions.
  user: [
    ...defaultStatements.user,
    "read",
    "disable",
    "resetPassword",
    "bulkUpsert",
    "readProfile",
    "updateProfile",
  ],
  session: [...defaultStatements.session, "read"],

  organization: ["create", "read", "list", "update"],
  domain: ["create", "read", "list", "verify", "delete", "provision"],
  course: ["create", "read", "list", "update", "delete", "manage"],
  enrollment: [
    "create",
    "read",
    "list",
    "delete",
    "assignMentor",
    "updateRole",
  ],
  class: ["create", "read", "list", "update", "delete"],
  folder: ["read", "list", "update", "delete"],
  assignment: [
    "create",
    "read",
    "list",
    "update",
    "delete",
    "link",
    "evaluate",
  ],
  workspace: ["read", "configure", "start", "save", "uploadStarter"],
  submission: [
    "create",
    "read",
    "list",
    "update",
    "delete",
    "submit",
    "evaluate",
    "feedback",
  ],
  review: ["read", "list", "update"],
  testRun: ["create", "read", "list", "rerun", "record", "reap"],
  attendance: ["create", "read", "list", "delete"],
  doubt: ["create", "read", "list", "respond", "delete", "deleteAny"],
  note: ["read", "list", "update", "delete"],
  bookmark: ["read", "list", "toggle"],
  schedule: ["create", "read", "list", "update", "delete", "addAttachment"],
  holiday: ["create", "read", "list", "update", "delete"],
  certificate: ["read"],
  report: ["read", "export"],
  statistics: ["read"],
  leaderboard: ["read"],
  dashboard: ["read"],
  glimpse: ["read"],
  search: ["read"],
  mentor: ["read", "list"],
  notification: ["create", "read", "list", "update", "notifyBulk", "configure"],
  deviceToken: ["create", "list", "delete"],
  file: ["create", "read", "list", "update", "archive", "delete"],
  video: [
    "create",
    "read",
    "list",
    "update",
    "retry",
    "delete",
    "captions",
    "progress",
  ],
  chat: [
    "create",
    "read",
    "list",
    "send",
    "delete",
    "pin",
    "react",
    "manage",
    "leave",
  ],
  sandbox: ["create", "read", "validate", "cleanup"],
  ai: ["read", "execute"],
  codingProfile: ["read", "list", "validate"],
  serviceConnection: ["create", "read", "list", "update", "delete", "test"],
  portSession: ["create", "read", "list", "close"],
  integration: ["read", "update", "delete"],
  featureFlag: ["read"],
} as const;

export const ac = createAccessControl(statement);

export type Statement = typeof statement;
export type Resource = keyof Statement;
export type ActionsOf<R extends Resource> = Statement[R][number];

/** A request passed to `authorize`, e.g. `{ course: ["update"] }`. */
export type PermissionRequest = {
  [R in Resource]?:
    | readonly ActionsOf<R>[]
    | { actions: readonly ActionsOf<R>[]; connector: "OR" | "AND" };
};

/** Grants held by a single role: a subset of `statement`. */
export type Grants = { [R in Resource]?: readonly ActionsOf<R>[] };

/**
 * Structural shape of a role produced by `ac.newRole`, widened so a role looked
 * up by name can be authorized against any `PermissionRequest`.
 */
export interface AccessRole {
  authorize(
    request: PermissionRequest,
    connector?: "OR" | "AND",
  ): AuthorizeResponse;
  statements: Grants;
}

export const ROLE_NAMES = [
  "STUDENT",
  "MENTOR",
  "INSTRUCTOR",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

export type RoleName = (typeof ROLE_NAMES)[number];

type MutuallyAssignable<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : never
  : never;

/**
 * Compile-time guard: adding or renaming a role in the Prisma schema without
 * updating `ROLE_NAMES` (and therefore the grant table) fails typecheck.
 */
export type RoleNamesMatchPrismaRole = MutuallyAssignable<RoleName, PrismaRole>;

/*
 * Grants are composed as supersets: each role literally spreads the one below
 * it, so STUDENT ⊆ MENTOR ⊆ INSTRUCTOR ⊆ ADMIN ⊆ SUPER_ADMIN holds structurally
 * and cannot drift. This deliberately fixes today's accident where ADMIN is
 * weaker than INSTRUCTOR because ~40 gates hardcode `role === "INSTRUCTOR"`.
 */

const STUDENT_GRANTS = {
  course: ["read", "list"],
  class: ["read", "list"],
  folder: ["read", "list"],
  assignment: ["read", "list"],
  workspace: ["read", "start", "save"],
  submission: ["create", "read", "submit"],
  review: ["read", "list"],
  testRun: ["create", "read"],
  attendance: ["read"],
  doubt: ["create", "read", "list", "respond", "delete"],
  note: ["read", "list", "update", "delete"],
  bookmark: ["read", "list", "toggle"],
  schedule: ["read", "list"],
  holiday: ["read", "list"],
  // Only students can currently fetch certificate data
  // (certificates.getStudentCertificateData). The superset invariant means every
  // role holds `certificate:read`; the student-only restriction stays a runtime
  // check in the router.
  certificate: ["read"],
  statistics: ["read"],
  leaderboard: ["read"],
  dashboard: ["read"],
  search: ["read"],
  user: ["readProfile", "updateProfile"],
  session: ["read", "list", "delete"],
  notification: ["read", "list", "update", "configure"],
  deviceToken: ["create", "list", "delete"],
  file: ["create", "read", "list"],
  video: ["read", "progress"],
  chat: ["create", "read", "list", "send", "delete", "pin", "react", "leave"],
  sandbox: ["create", "read", "validate", "cleanup"],
  codingProfile: ["read", "list", "validate"],
  serviceConnection: ["create", "read", "list", "update", "delete", "test"],
  portSession: ["create", "read", "list", "close"],
  integration: ["read", "update", "delete"],
  featureFlag: ["read"],
} satisfies Grants;

const MENTOR_GRANTS = {
  ...STUDENT_GRANTS,
  assignment: [...STUDENT_GRANTS.assignment, "evaluate"],
  submission: [
    ...STUDENT_GRANTS.submission,
    "list",
    "evaluate",
    "feedback",
    "delete",
  ],
  review: [...STUDENT_GRANTS.review, "update"],
  testRun: [...STUDENT_GRANTS.testRun, "list"],
  attendance: [...STUDENT_GRANTS.attendance, "list"],
  enrollment: ["read", "list"],
  mentor: ["read", "list"],
  // `get` is better-auth's default read action; mentors hold it today.
  user: [...STUDENT_GRANTS.user, "read", "list", "get"],
  report: ["read", "export"],
  glimpse: ["read"],
  video: [...STUDENT_GRANTS.video, "list"],
  notification: [...STUDENT_GRANTS.notification, "create", "notifyBulk"],
} satisfies Grants;

const INSTRUCTOR_GRANTS = {
  ...MENTOR_GRANTS,
  course: [...MENTOR_GRANTS.course, "create", "update", "delete", "manage"],
  enrollment: [
    ...MENTOR_GRANTS.enrollment,
    "create",
    "delete",
    "assignMentor",
    "updateRole",
  ],
  class: [...MENTOR_GRANTS.class, "create", "update", "delete"],
  folder: [...MENTOR_GRANTS.folder, "update", "delete"],
  assignment: [
    ...MENTOR_GRANTS.assignment,
    "create",
    "update",
    "delete",
    "link",
  ],
  workspace: [...MENTOR_GRANTS.workspace, "configure", "uploadStarter"],
  submission: [...MENTOR_GRANTS.submission, "update"],
  testRun: [...MENTOR_GRANTS.testRun, "rerun", "record", "reap"],
  attendance: [...MENTOR_GRANTS.attendance, "create", "delete"],
  doubt: [...MENTOR_GRANTS.doubt, "deleteAny"],
  schedule: [
    ...MENTOR_GRANTS.schedule,
    "create",
    "update",
    "delete",
    "addAttachment",
  ],
  holiday: [...MENTOR_GRANTS.holiday, "create", "update", "delete"],
  // Full better-auth admin surface: instructors are in `adminRoles`.
  user: [
    ...MENTOR_GRANTS.user,
    "create",
    "update",
    "delete",
    "disable",
    "resetPassword",
    "bulkUpsert",
    "set-role",
    "ban",
    "impersonate",
    "set-password",
  ],
  session: [...MENTOR_GRANTS.session, "revoke"],
  file: [...MENTOR_GRANTS.file, "update", "archive", "delete"],
  video: [
    ...MENTOR_GRANTS.video,
    "create",
    "update",
    "retry",
    "delete",
    "captions",
  ],
  chat: [...MENTOR_GRANTS.chat, "manage"],
  ai: ["read", "execute"],
} satisfies Grants;

// ADMIN adds nothing over INSTRUCTOR yet; it exists so the hierarchy is total.
const ADMIN_GRANTS = { ...INSTRUCTOR_GRANTS } satisfies Grants;

const SUPER_ADMIN_GRANTS = {
  ...ADMIN_GRANTS,
  organization: ["create", "read", "list", "update"],
  domain: ["create", "read", "list", "verify", "delete", "provision"],
} satisfies Grants;

export const studentRole = ac.newRole(STUDENT_GRANTS);
export const mentorRole = ac.newRole(MENTOR_GRANTS);
export const instructorRole = ac.newRole(INSTRUCTOR_GRANTS);
export const adminRole = ac.newRole(ADMIN_GRANTS);
export const superAdminRole = ac.newRole(SUPER_ADMIN_GRANTS);

export const ROLES: Record<RoleName, AccessRole> = {
  STUDENT: studentRole,
  MENTOR: mentorRole,
  INSTRUCTOR: instructorRole,
  ADMIN: adminRole,
  SUPER_ADMIN: superAdminRole,
};

/** Grant table keyed by role, for tooling, docs and tests. */
export const ROLE_GRANTS: Record<RoleName, Grants> = {
  STUDENT: STUDENT_GRANTS,
  MENTOR: MENTOR_GRANTS,
  INSTRUCTOR: INSTRUCTOR_GRANTS,
  ADMIN: ADMIN_GRANTS,
  SUPER_ADMIN: SUPER_ADMIN_GRANTS,
};
