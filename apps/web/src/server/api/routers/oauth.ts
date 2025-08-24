import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { db } from "@/lib/db";

export const oauthRouter = createTRPCRouter({
  unlinkAccount: protectedProcedure
    .input(z.object({ provider: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { provider } = input;
      const currentUser = ctx.session.user;

      try {
        await db.account.deleteMany({
          where: {
            userId: currentUser.id,
            providerId: provider,
          },
        });
        return { success: true };
      } catch (error) {
        console.error(`Failed to unlink ${provider} account:`, error);
        return { success: false, error: "Failed to unlink account" };
      }
    }),
});
