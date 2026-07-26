import { z } from "zod";

import { BookMarkCategory } from "@tutly/db/browser";

import {
  requireRecordOwner,
  requireUserInOrganization,
} from "../lib/authorization";
import { createTRPCRouter, permissionProcedure } from "../trpc";

export const bookmarksRouter = createTRPCRouter({
  toggleBookmark: permissionProcedure("bookmark", "toggle")
    .input(
      z.object({
        category: z.nativeEnum(BookMarkCategory),
        objectId: z.string(),
        causedObjects: z.record(z.string(), z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      const existingBookmark = await ctx.db.bookMarks.findFirst({
        where: {
          category: input.category,
          objectId: input.objectId,
          userId: currentUser.id,
        },
      });

      if (existingBookmark) {
        await ctx.db.bookMarks.delete({
          where: {
            id: existingBookmark.id,
          },
        });
        return { bookmarked: false };
      }

      await ctx.db.bookMarks.create({
        data: {
          category: input.category,
          objectId: input.objectId,
          userId: currentUser.id,
          causedObjects: input.causedObjects,
        },
      });

      return { bookmarked: true };
    }),

  getBookmark: permissionProcedure("bookmark", "read")
    .input(
      z.object({
        userId: z.string(),
        objectId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // A bookmark is private to its owner; staff may read one in their own org.
      if (input.userId !== ctx.session.user.id) {
        await requireUserInOrganization(ctx, input.userId);
      }
      requireRecordOwner(ctx, { userId: input.userId }, { allowStaff: true });

      return ctx.db.bookMarks.findFirst({
        where: {
          userId: input.userId,
          objectId: input.objectId,
        },
      });
    }),

  getUserBookmarks: permissionProcedure("bookmark", "list").query(
    async ({ ctx }) => {
      return ctx.db.bookMarks.findMany({
        where: {
          userId: ctx.session.user.id,
        },
      });
    },
  ),
});
