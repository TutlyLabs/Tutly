import { TRPCError } from "@trpc/server";

import type { TRPCContext } from "../trpc";

type UserLike = NonNullable<TRPCContext["session"]>["user"];

const elevatedRoles = new Set(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"]);

export function canManageAssignment(user: UserLike, assignment: AssignmentForAccess) {
  if (elevatedRoles.has(user.role)) return true;
  if (assignment.course?.createdById === user.id) return true;
  return assignment.course?.courseAdmins.some((admin) => admin.id === user.id) ?? false;
}

type AssignmentForAccess = Awaited<ReturnType<typeof getAssignmentForAccess>>;

async function getAssignmentForAccess(ctx: TRPCContext, assignmentId: string) {
  const assignment = await ctx.db.attachment.findUnique({
    where: { id: assignmentId },
    include: {
      course: {
        include: {
          courseAdmins: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!assignment) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
  }

  return assignment;
}

export async function requireAssignmentReadAccess(
  ctx: TRPCContext,
  assignmentId: string,
) {
  const user = ctx.session?.user;
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

  const assignment = await getAssignmentForAccess(ctx, assignmentId);
  if (canManageAssignment(user, assignment)) return assignment;

  if (user.role === "MENTOR") {
    const menteeCount = await ctx.db.enrolledUsers.count({
      where: {
        courseId: assignment.courseId,
        mentorUsername: user.username,
      },
    });
    if (menteeCount > 0) return assignment;
  }

  const enrollment = await ctx.db.enrolledUsers.findFirst({
    where: {
      courseId: assignment.courseId,
      username: user.username,
    },
  });

  if (!enrollment) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No assignment access" });
  }

  return assignment;
}

export async function requireAssignmentManageAccess(
  ctx: TRPCContext,
  assignmentId: string,
) {
  const user = ctx.session?.user;
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

  const assignment = await getAssignmentForAccess(ctx, assignmentId);
  if (!canManageAssignment(user, assignment)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only instructors can manage this workspace assignment" });
  }

  return assignment;
}

export async function getStudentEnrollmentForAssignment(
  ctx: TRPCContext,
  assignmentId: string,
) {
  const user = ctx.session?.user;
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

  const assignment = await requireAssignmentReadAccess(ctx, assignmentId);
  const enrollment = await ctx.db.enrolledUsers.findFirst({
    where: {
      username: user.username,
      courseId: assignment.courseId,
    },
  });

  if (!enrollment) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You are not enrolled in this course" });
  }

  return { assignment, enrollment };
}

export async function requireSubmissionReadAccess(
  ctx: TRPCContext,
  submissionId: string,
) {
  const user = ctx.session?.user;
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

  const submission = await ctx.db.submission.findUnique({
    where: { id: submissionId },
    include: {
      enrolledUser: true,
      assignment: {
        include: {
          course: {
            include: {
              courseAdmins: {
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });

  if (!submission) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
  }

  if (canManageAssignment(user, submission.assignment)) return submission;
  if (submission.enrolledUser.username === user.username) return submission;
  if (submission.enrolledUser.mentorUsername === user.username) return submission;

  throw new TRPCError({ code: "FORBIDDEN", message: "No submission access" });
}

export async function requireSubmissionReviewAccess(
  ctx: TRPCContext,
  submissionId: string,
) {
  const submission = await requireSubmissionReadAccess(ctx, submissionId);
  const user = ctx.session?.user;
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

  if (
    canManageAssignment(user, submission.assignment) ||
    submission.enrolledUser.mentorUsername === user.username
  ) {
    return submission;
  }

  throw new TRPCError({ code: "FORBIDDEN", message: "Only mentors and instructors can review this submission" });
}
