import { NoteCategory } from '@prisma/client';
import { z } from 'zod';

import { createTRPCRouter, protectedProcedure } from '../trpc';

export const notesRouter = createTRPCRouter({
  updateNote: protectedProcedure
    .input(
      z.object({
        category: z.nativeEnum(NoteCategory),
        description: z.string().nullable(),
        tags: z.array(z.string()),
        objectId: z.string(),
        causedObjects: z.record(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUserId = ctx.session.user.id;

      const { category, description, tags, objectId, causedObjects = {} } = input;

      if (!description) {
        await ctx.db.notes.delete({
          where: {
            userId_objectId: {
              userId: currentUserId,
              objectId,
            },
          },
        });
        return { success: true };
      }

      await ctx.db.notes.upsert({
        where: {
          userId_objectId: {
            userId: currentUserId,
            objectId,
          },
        },
        create: {
          category,
          description,
          tags,
          userId: currentUserId,
          objectId,
          causedObjects,
        },
        update: {
          description,
          tags,
          causedObjects,
        },
      });
      return { success: true };
    }),

  getNote: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        objectId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const note = await ctx.db.notes.findUnique({
          where: {
            userId_objectId: {
              userId: input.userId,
              objectId: input.objectId,
            },
          },
        });

        return { success: true, data: note };
      } catch (error) {
        console.error('Error getting note:', error);
        return { error: 'Failed to get note' };
      }
    }),

  getNotes: protectedProcedure.query(async ({ ctx }) => {
    const currentUserId = ctx.session.user.id;

    const notes = await ctx.db.notes.findMany({
      where: {
        userId: currentUserId,
      },
    });

    return { success: true, data: notes };
  }),
});
