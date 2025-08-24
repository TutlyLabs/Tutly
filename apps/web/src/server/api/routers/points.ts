import type { pointCategory } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const pointsRouter = createTRPCRouter({
  addPoints: protectedProcedure
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
      try {
        const currentUser = ctx.session.user;
        if (currentUser.role === "STUDENT") {
          return { error: "Unauthorized" };
        }

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

  deleteSubmission: protectedProcedure
    .input(
      z.object({
        submissionId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      if (currentUser.role === "STUDENT") {
        return { error: "Unauthorized" };
      }

      await ctx.db.submission.delete({
        where: {
          id: input.submissionId,
        },
      });

      return { success: true };
    }),
});
