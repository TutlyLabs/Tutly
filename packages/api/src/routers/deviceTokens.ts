import { DevicePlatform } from "@tutly/db/browser";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const deviceTokensRouter = createTRPCRouter({
  register: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1),
        platform: z.enum(["IOS", "ANDROID"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const platform = input.platform as DevicePlatform;

      return ctx.db.deviceToken.upsert({
        where: { token: input.token },
        update: { userId, platform, lastSeen: new Date() },
        create: { userId, platform, token: input.token },
      });
    }),

  unregister: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.deviceToken.deleteMany({
        where: { token: input.token, userId: ctx.session.user.id },
      });
    }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.deviceToken.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { lastSeen: "desc" },
    });
  }),
});
