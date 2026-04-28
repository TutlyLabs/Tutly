import { z } from "zod";

import {
  canManageAssignment,
  requireAssignmentReadAccess,
  requireSubmissionReviewAccess,
} from "../lib/workspace-access";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const reviewsRouter = createTRPCRouter({
  getQueue: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string().optional(),
        status: z
          .enum(["NEEDS_REVIEW", "REVIEWED", "CHANGES_REQUESTED", "AUTO_SCORED"])
          .optional(),
        includeNotSubmitted: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;
      if (input.assignmentId) {
        await requireAssignmentReadAccess(ctx, input.assignmentId);
      }

      const submissions = await ctx.db.submission.findMany({
        where: {
          attachmentId: input.assignmentId,
          status: "SUBMITTED",
          ...(user.role === "MENTOR"
            ? { enrolledUser: { mentorUsername: user.username } }
            : {}),
          ...(user.role === "STUDENT"
            ? { enrolledUser: { username: user.username } }
            : {}),
          review: input.status ? { status: input.status } : undefined,
        },
        include: {
          enrolledUser: {
            include: {
              user: true,
            },
          },
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
          points: true,
          artifacts: {
            where: { isLatest: true },
            orderBy: { createdAt: "desc" },
          },
          testRuns: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          review: true,
        },
        orderBy: { submissionDate: "desc" },
      });

      const visibleSubmissions = submissions.filter((submission) => {
        if (user.role === "STUDENT") return submission.enrolledUser.username === user.username;
        if (user.role === "MENTOR") return submission.enrolledUser.mentorUsername === user.username;
        return canManageAssignment(user, submission.assignment);
      });

      let notSubmitted: Array<{ id: string; username: string; mentorUsername: string | null }> = [];
      if (input.assignmentId && input.includeNotSubmitted) {
        const assignment = await requireAssignmentReadAccess(ctx, input.assignmentId);
        const submittedEnrollmentIds = new Set(
          visibleSubmissions.map((submission) => submission.enrolledUserId),
        );
        notSubmitted = await ctx.db.enrolledUsers.findMany({
          where: {
            courseId: assignment.courseId,
            ...(user.role === "MENTOR" ? { mentorUsername: user.username } : {}),
            id: { notIn: Array.from(submittedEnrollmentIds) },
          },
          select: {
            id: true,
            username: true,
            mentorUsername: true,
          },
          orderBy: { username: "asc" },
        });
      }

      return {
        success: true,
        data: {
          submissions: visibleSubmissions,
          notSubmitted,
        },
      };
    }),

  updateReview: protectedProcedure
    .input(
      z.object({
        submissionId: z.string(),
        status: z
          .enum(["NEEDS_REVIEW", "REVIEWED", "CHANGES_REQUESTED", "AUTO_SCORED"])
          .optional(),
        feedback: z.string().optional(),
        manualScore: z.number().int().min(0).optional(),
        maxScore: z.number().int().min(0).optional(),
        applyManualOverride: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const submission = await requireSubmissionReviewAccess(ctx, input.submissionId);
      const reviewedAt =
        input.status === "REVIEWED" || input.status === "CHANGES_REQUESTED"
          ? new Date()
          : undefined;

      const review = await ctx.db.submissionReview.upsert({
        where: { submissionId: submission.id },
        create: {
          submissionId: submission.id,
          assignmentId: submission.attachmentId,
          reviewerId: ctx.session.user.id,
          status: input.status ?? "REVIEWED",
          feedback: input.feedback,
          manualScore: input.manualScore,
          maxScore: input.maxScore,
          reviewedAt,
        },
        update: {
          reviewerId: ctx.session.user.id,
          status: input.status,
          feedback: input.feedback,
          manualScore: input.manualScore,
          maxScore: input.maxScore,
          reviewedAt,
        },
      });

      if (input.feedback !== undefined) {
        await ctx.db.submission.update({
          where: { id: submission.id },
          data: { overallFeedback: input.feedback },
        });
      }

      if (input.manualScore !== undefined && input.applyManualOverride) {
        await ctx.db.point.upsert({
          where: {
            submissionId_category: {
              submissionId: submission.id,
              category: "TESTS",
            },
          },
          create: {
            submissionId: submission.id,
            category: "TESTS",
            score: input.manualScore,
            maxScore: input.maxScore ?? review.maxScore,
            source: "manual_override",
            feedback: input.feedback,
            metadata: {
              reviewerId: ctx.session.user.id,
              reviewId: review.id,
            } as never,
          },
          update: {
            score: input.manualScore,
            maxScore: input.maxScore ?? review.maxScore,
            source: "manual_override",
            feedback: input.feedback,
            metadata: {
              reviewerId: ctx.session.user.id,
              reviewId: review.id,
            } as never,
          },
        });
      }

      return { success: true, data: review };
    }),
});

