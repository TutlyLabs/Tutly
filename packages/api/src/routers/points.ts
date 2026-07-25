import type { pointCategory } from "@tutly/db/browser";
import { z } from "zod";

import { requireSubmissionReviewAccess } from "../lib/authorization";
import { createTRPCRouter, permissionProcedure } from "../trpc";

export const pointsRouter = createTRPCRouter({
  addPoints: permissionProcedure("submission", "evaluate")
    .input(
      z.object({
        submissionId: z.string(),
        marks: z.array(
          z.object({
            category: z.string().transform((val) => val as pointCategory),
            score: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      await requireSubmissionReviewAccess(ctx, input.submissionId);

      try {
        const allCategories = await Promise.all(
          input.marks.map(async (mark) => {
            const existingPoint = await ctx.db.point.findFirst({
              where: {
                submissionId: input.submissionId,
                category: mark.category,
              },
            });

            await ctx.db.events.create({
              data: {
                eventCategory: "ASSIGNMENT_EVALUATION",
                causedById: currentUser.id,
                eventCategoryDataId: input.submissionId,
              },
            });

            if (existingPoint) {
              return await ctx.db.point.update({
                where: {
                  id: existingPoint.id,
                },
                data: {
                  score: mark.score,
                },
              });
            } else {
              return await ctx.db.point.create({
                data: {
                  submissionId: input.submissionId,
                  category: mark.category,
                  score: mark.score,
                },
              });
            }
          }),
        );

        return { success: true, data: allCategories };
      } catch {
        return { error: "Error in adding points" };
      }
    }),

  // Same rule as submission.deleteSubmission: the static `submission:delete`
  // grant (MENTOR and above) plus review access to that specific submission.
  deleteSubmission: permissionProcedure("submission", "delete")
    .input(
      z.object({
        submissionId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireSubmissionReviewAccess(ctx, input.submissionId);

      await ctx.db.submission.delete({
        where: {
          id: input.submissionId,
        },
      });

      return { success: true };
    }),
});
