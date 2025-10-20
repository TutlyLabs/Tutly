import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const foldersRouter = createTRPCRouter({
  updateFolder: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updatedFolder = await ctx.db.folder.update({
        where: { id: input.id },
        data: { title: input.title },
      });
      return { success: true, data: updatedFolder };
    }),

  deleteFolder: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      if (currentUser.role !== "INSTRUCTOR") {
        throw new Error("You must be an instructor to delete a folder");
      }

      // Check if folder has classes
      const folder = await ctx.db.folder.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { Class: true },
          },
        },
      });

      if (!folder) {
        throw new Error("Folder not found");
      }

      if (folder._count.Class > 0) {
        throw new Error(
          "Cannot delete folder with classes. Please move or delete the classes first.",
        );
      }

      await ctx.db.folder.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
