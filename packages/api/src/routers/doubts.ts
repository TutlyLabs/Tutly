import { z } from "zod";

import {
  requireCourseReadAccess,
  requireRecordOwner,
} from "../lib/authorization";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const doubtsRouter = createTRPCRouter({

  getDoubtById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const doubt = await ctx.db.doubt.findUnique({
        where: { id: input.id },
        include: {
          user: { select: { id: true, name: true, username: true, image: true, role: true } },
          course: { select: { id: true, title: true } },
          response: {
            include: {
              user: { select: { id: true, name: true, username: true, image: true, role: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });
      if (!doubt) return null;
      if (doubt.courseId) {
        await requireCourseReadAccess(ctx, doubt.courseId);
      } else {
        requireRecordOwner(ctx, doubt, { allowStaff: true });
      }

      // Find the community group for this course
      const group = doubt.courseId
        ? await ctx.db.chatGroup.findFirst({
            where: { courseId: doubt.courseId, type: "COURSE" },
            select: { id: true },
          })
        : null;

      return { doubt, communityGroupId: group?.id ?? null };
    }),
});
