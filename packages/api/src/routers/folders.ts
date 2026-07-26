import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { TRPCContext } from "../trpc";
import { requireCourseManageAccess } from "../lib/authorization";
import { createTRPCRouter, permissionProcedure } from "../trpc";

/**
 * A Folder has no course column of its own, only the classes that point at it,
 * so it is scoped through those classes: the caller must be able to manage every
 * course the folder's classes belong to. An empty folder has nothing to scope
 * against and falls back to the static folder grant.
 */
async function requireFolderManageAccess(ctx: TRPCContext, folderId: string) {
  const folder = await ctx.db.folder.findUnique({
    where: { id: folderId },
    select: { id: true, Class: { select: { courseId: true } } },
  });
  if (!folder) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
  }

  const courseIds = [
    ...new Set(
      folder.Class.map((cls) => cls.courseId).filter(
        (id): id is string => id !== null,
      ),
    ),
  ];
  for (const courseId of courseIds) {
    await requireCourseManageAccess(ctx, courseId);
  }

  return folder;
}

export const foldersRouter = createTRPCRouter({
  updateFolder: permissionProcedure("folder", "update")
    .input(
      z.object({
        id: z.string(),
        title: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireFolderManageAccess(ctx, input.id);

      return ctx.db.folder.update({
        where: { id: input.id },
        data: { title: input.title },
      });
    }),

  deleteFolder: permissionProcedure("folder", "delete")
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const folder = await requireFolderManageAccess(ctx, input.id);

      if (folder.Class.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot delete folder with classes. Please move or delete the classes first.",
        });
      }

      return ctx.db.folder.delete({
        where: { id: input.id },
      });
    }),
});
