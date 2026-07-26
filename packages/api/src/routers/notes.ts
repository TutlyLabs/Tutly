import { z } from "zod";

import { NoteCategory } from "@tutly/db/browser";

import {
  requireRecordOwner,
  requireUserInOrganization,
} from "../lib/authorization";
import { createTRPCRouter, permissionProcedure } from "../trpc";

export const notesRouter = createTRPCRouter({
  updateNote: permissionProcedure("note", "update")
    .input(
      z.object({
        category: z.nativeEnum(NoteCategory),
        description: z.string().nullable(),
        descriptionJson: z.any().nullable().optional(),
        tags: z.array(z.string()),
        objectId: z.string(),
        causedObjects: z.record(z.string(), z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUserId = ctx.session.user.id;

      const {
        category,
        description,
        descriptionJson,
        tags,
        objectId,
        causedObjects = {},
      } = input;

      if (!description && !descriptionJson) {
        // Clearing a note that was never persisted is a no-op, not an error.
        await ctx.db.notes.deleteMany({
          where: { userId: currentUserId, objectId },
        });
        return null;
      }

      return ctx.db.notes.upsert({
        where: {
          userId_objectId: {
            userId: currentUserId,
            objectId,
          },
        },
        create: {
          category,
          description,
          descriptionJson,
          tags,
          userId: currentUserId,
          objectId,
          causedObjects,
        },
        update: {
          description,
          descriptionJson,
          tags,
          causedObjects,
        },
      });
    }),

  getNote: permissionProcedure("note", "read")
    .input(
      z.object({
        userId: z.string(),
        objectId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // A note is private to its author; staff may read one in their own org.
      if (input.userId !== ctx.session.user.id) {
        await requireUserInOrganization(ctx, input.userId);
      }
      requireRecordOwner(ctx, { userId: input.userId }, { allowStaff: true });

      return ctx.db.notes.findUnique({
        where: {
          userId_objectId: {
            userId: input.userId,
            objectId: input.objectId,
          },
        },
      });
    }),

  getNotes: permissionProcedure("note", "list").query(async ({ ctx }) => {
    return ctx.db.notes.findMany({
      where: {
        userId: ctx.session.user.id,
      },
    });
  }),
});
