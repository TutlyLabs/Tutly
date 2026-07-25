import { BookMarkCategory } from "@tutly/db/browser";
import { z } from "zod";

import { createTRPCRouter, permissionProcedure } from "../trpc";
import {
  requireRecordOwner,
  requireUserInOrganization,
} from "../lib/authorization";

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
      } else {
        await ctx.db.bookMarks.create({
          data: {
            category: input.category,
            objectId: input.objectId,
            userId: currentUser.id,
            causedObjects: input.causedObjects,
          },
        });
      }

      return { success: true };
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

      try {
        const bookmark = await ctx.db.bookMarks.findFirst({
          where: {
            userId: input.userId,
            objectId: input.objectId,
          },
        });

        return { success: true, data: bookmark };
      } catch (error) {
        console.error("Error getting bookmark:", error);
        return { error: "Failed to get bookmark" };
      }
    }),

  getUserBookmarks: permissionProcedure("bookmark", "list").query(async ({ ctx }) => {
    try {
      const currentUser = ctx.session.user;

      const bookmarks = await ctx.db.bookMarks.findMany({
        where: {
          userId: currentUser.id,
        },
      });

      return {
        success: true,
        data: bookmarks,
      };
    } catch (error) {
      console.error("Error fetching user bookmarks:", error);
      return {
        success: false,
        error: "Failed to fetch user bookmarks",
      };
    }
  }),
});
