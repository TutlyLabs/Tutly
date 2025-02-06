import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { bookmarkCategoryEnum, bookmarks } from "@tutly/db/schema";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const bookmarksRouter = createTRPCRouter({
  toggleBookmark: protectedProcedure
    .input(
      z.object({
        category: z.enum(bookmarkCategoryEnum.enumValues),
        objectId: z.string(),
        causedObjects: z.record(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const existingBookmark = await ctx.db.query.bookmarks.findFirst({
        where: and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.objectId, input.objectId),
          eq(bookmarks.category, input.category),
        ),
      });

      if (existingBookmark) {
        await ctx.db
          .delete(bookmarks)
          .where(eq(bookmarks.id, existingBookmark.id));
      } else {
        await ctx.db.insert(bookmarks).values({
          category: input.category,
          objectId: input.objectId,
          userId,
          causedObjects: input.causedObjects
            ? sql`${JSON.stringify(input.causedObjects)}::jsonb`
            : undefined,
        });
      }

      return { success: true };
    }),

  getBookmark: protectedProcedure
    .input(z.object({ objectId: z.string(), userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.bookmarks.findFirst({
        where: and(
          eq(bookmarks.objectId, input.objectId),
          eq(bookmarks.userId, input.userId),
        ),
      });
    }),

  getUserBookmarks: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    return ctx.db.query.bookmarks.findMany({
      where: eq(bookmarks.userId, userId),
    });
  }),
});
