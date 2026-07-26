import { z } from "zod";

import { requireSubmissionReviewAccess } from "../lib/workspace-access";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const reviewsRouter = createTRPCRouter({
  updateReview: protectedProcedure
    .input(
      z.object({
        submissionId: z.string(),
        status: z
          .enum([
            "NEEDS_REVIEW",
            "REVIEWED",
            "CHANGES_REQUESTED",
            "AUTO_SCORED",
          ])
          .optional(),
        feedback: z.string().optional(),
        manualScore: z.number().int().min(0).optional(),
        maxScore: z.number().int().min(0).optional(),
        applyManualOverride: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const submission = await requireSubmissionReviewAccess(
        ctx,
        input.submissionId,
      );
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

      return review;
    }),
});
