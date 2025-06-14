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
});
