import { TRPCError } from "@trpc/server";

import type { TRPCContext } from "../trpc";

/**
 * Resource-scoped authorization.
 *
 * Static role grants (`@tutly/auth`) answer "may this role ever do X". They
 * cannot answer "may this user do X *to this record*", which is the majority of
 * real checks here. Everything in this module is that second question, plus the
 * organization tenancy filter — which is a universal filter, not a permission:
 * holding `user:read` never means reading another tenant's users.
 *
 * `./workspace-access` holds the assignment/submission-scoped variants and is
 * re-exported below so callers have one import site.
 */

export {
  canManageAssignment,
  requireAssignmentReadAccess,
  requireAssignmentManageAccess,
  getStudentEnrollmentForAssignment,
  requireSubmissionReadAccess,
  requireSubmissionReviewAccess,
} from "./workspace-access";

type AuthedUser = NonNullable<NonNullable<TRPCContext["session"]>["user"]>;

const STAFF_ROLES = new Set(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"]);

export function isStaff(user: AuthedUser) {
  return STAFF_ROLES.has(user.role);
}

/** Anyone above STUDENT. */
export function isMentorOrAbove(user: AuthedUser) {
  return user.role !== "STUDENT";
}

export function requireUser(ctx: TRPCContext): AuthedUser {
  const user = ctx.session?.user;
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return user;
}

export function requireStaff(ctx: TRPCContext): AuthedUser {
  const user = requireUser(ctx);
  if (!isStaff(user)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Staff access required" });
  }
  return user;
}

/* -------------------------------------------------------------------------- */
/* Organization tenancy                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Universal tenancy filter. Users without an organization are only ever visible
 * to themselves, so a null organizationId can never match another null one.
 */
export function isSameOrganization(
  user: AuthedUser,
  other: { organizationId: string | null },
) {
  return (
    user.organizationId !== null && user.organizationId === other.organizationId
  );
}

export function requireSameOrganization(
  user: AuthedUser,
  other: { id?: string; organizationId: string | null },
) {
  if (other.id && other.id === user.id) return;
  if (!isSameOrganization(user, other)) {
    // NOT_FOUND, not FORBIDDEN: a cross-tenant record must not be confirmed to exist.
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }
}

/** Loads a user by id and asserts it is in the caller's organization. */
export async function requireUserInOrganization(
  ctx: TRPCContext,
  userId: string,
) {
  const actor = requireUser(ctx);
  const target = await ctx.db.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true, organizationId: true },
  });
  if (!target) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }
  requireSameOrganization(actor, target);
  return target;
}

/** Loads a user by username and asserts it is in the caller's organization. */
export async function requireUsernameInOrganization(
  ctx: TRPCContext,
  username: string,
) {
  const actor = requireUser(ctx);
  const target = await ctx.db.user.findUnique({
    where: { username },
    select: { id: true, username: true, role: true, organizationId: true },
  });
  if (!target) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }
  requireSameOrganization(actor, target);
  return target;
}

/* -------------------------------------------------------------------------- */
/* Course scope                                                               */
/* -------------------------------------------------------------------------- */

type CourseForAccess = {
  id: string;
  createdById: string;
  courseAdmins: { id: string }[];
};

export function isCourseOwner(user: AuthedUser, course: { createdById: string }) {
  return course.createdById === user.id;
}

export function isCourseAdmin(user: AuthedUser, course: CourseForAccess) {
  if (course.courseAdmins.some((admin) => admin.id === user.id)) return true;
  return user.adminForCourses.some((c) => c.id === course.id);
}

/** Owner, explicit course admin, or a global staff role. */
export function canManageCourse(user: AuthedUser, course: CourseForAccess) {
  return isCourseOwner(user, course) || isCourseAdmin(user, course) || isStaff(user);
}

async function loadCourse(ctx: TRPCContext, courseId: string) {
  const course = await ctx.db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      createdById: true,
      courseAdmins: { select: { id: true } },
    },
  });
  if (!course) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
  }
  return course;
}

export async function requireCourseManageAccess(
  ctx: TRPCContext,
  courseId: string,
) {
  const user = requireUser(ctx);
  const course = await loadCourse(ctx, courseId);
  if (!canManageCourse(user, course)) {
    // NOT_FOUND so a non-member cannot probe which course ids exist.
    throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
  }
  return course;
}

/** Managers, mentors with a mentee in the course, and enrolled students. */
export async function requireCourseReadAccess(
  ctx: TRPCContext,
  courseId: string,
) {
  const user = requireUser(ctx);
  const course = await loadCourse(ctx, courseId);
  if (canManageCourse(user, course)) return course;

  const membership = await ctx.db.enrolledUsers.count({
    where: {
      courseId,
      OR: [{ username: user.username }, { mentorUsername: user.username }],
    },
  });
  if (membership === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
  }
  return course;
}

/** Same as above but keyed off a class, which is the id most routers hold. */
export async function requireClassReadAccess(ctx: TRPCContext, classId: string) {
  const cls = await ctx.db.class.findUnique({
    where: { id: classId },
    select: { id: true, courseId: true },
  });
  if (!cls?.courseId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
  }
  await requireCourseReadAccess(ctx, cls.courseId);
  return cls;
}

export async function requireClassManageAccess(
  ctx: TRPCContext,
  classId: string,
) {
  const cls = await ctx.db.class.findUnique({
    where: { id: classId },
    select: { id: true, courseId: true },
  });
  if (!cls?.courseId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
  }
  await requireCourseManageAccess(ctx, cls.courseId);
  return cls;
}

/* -------------------------------------------------------------------------- */
/* Mentor / student scope                                                     */
/* -------------------------------------------------------------------------- */

/** True when `studentUsername` is enrolled under this mentor anywhere. */
export async function isMentorOfStudent(
  ctx: TRPCContext,
  mentorUsername: string,
  studentUsername: string,
  courseId?: string,
) {
  const count = await ctx.db.enrolledUsers.count({
    where: {
      username: studentUsername,
      mentorUsername,
      ...(courseId ? { courseId } : {}),
    },
  });
  return count > 0;
}

/**
 * The canonical fix for the "arbitrary username override" family: a procedure
 * takes an optional username and used to trust it outright. Staff may target
 * anyone in their organization, a mentor only their own mentees, and everyone
 * else only themselves.
 */
export async function resolveTargetUsername(
  ctx: TRPCContext,
  requested: string | null | undefined,
  courseId?: string,
): Promise<string> {
  const user = requireUser(ctx);
  if (!requested || requested === user.username) return user.username;

  const target = await requireUsernameInOrganization(ctx, requested);

  if (isStaff(user)) return target.username;
  if (
    user.role === "MENTOR" &&
    (await isMentorOfStudent(ctx, user.username, target.username, courseId))
  ) {
    return target.username;
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You cannot access this user's data",
  });
}

/** As above, but for procedures keyed on a mentor username rather than a student. */
export async function resolveTargetMentorUsername(
  ctx: TRPCContext,
  requested: string | null | undefined,
): Promise<string> {
  const user = requireUser(ctx);
  if (!requested || requested === user.username) return user.username;
  if (!isStaff(user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You cannot access this mentor's data",
    });
  }
  const target = await requireUsernameInOrganization(ctx, requested);
  return target.username;
}

/** Self, the student's mentor, or staff. */
export async function requireStudentDataAccess(
  ctx: TRPCContext,
  studentUsername: string,
  courseId?: string,
) {
  const user = requireUser(ctx);
  if (studentUsername === user.username) return;
  if (isStaff(user)) {
    await requireUsernameInOrganization(ctx, studentUsername);
    return;
  }
  if (
    user.role === "MENTOR" &&
    (await isMentorOfStudent(ctx, user.username, studentUsername, courseId))
  ) {
    return;
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You cannot access this user's data",
  });
}

/* -------------------------------------------------------------------------- */
/* Record ownership                                                           */
/* -------------------------------------------------------------------------- */

/** Owner of the record, or staff. Used for notes, bookmarks, doubt responses. */
export function requireRecordOwner(
  ctx: TRPCContext,
  record: { userId?: string | null; username?: string | null },
  { allowStaff = false }: { allowStaff?: boolean } = {},
) {
  const user = requireUser(ctx);
  if (record.userId && record.userId === user.id) return;
  if (record.username && record.username === user.username) return;
  if (allowStaff && isStaff(user)) return;
  throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });
}

/* -------------------------------------------------------------------------- */
/* Files                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Files carry no course link, only an uploader and a public flag, so scoping
 * stops at uploader / public / staff. Anything finer needs a schema change.
 */
export async function requireFileReadAccess(ctx: TRPCContext, fileId: string) {
  const user = requireUser(ctx);
  const file = await ctx.db.file.findUnique({ where: { id: fileId } });
  if (!file) {
    throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
  }
  if (file.isPublic) return file;
  if (file.uploadedById === user.id) return file;
  if (isStaff(user)) return file;
  throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
}

export async function requireFileManageAccess(ctx: TRPCContext, fileId: string) {
  const user = requireUser(ctx);
  const file = await ctx.db.file.findUnique({ where: { id: fileId } });
  if (!file) {
    throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
  }
  if (file.uploadedById === user.id || isStaff(user)) return file;
  throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
}
