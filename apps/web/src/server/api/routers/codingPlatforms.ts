import { z } from "zod";

import {
  getPlatformScores,
  validatePlatformHandles,
} from "@/lib/coding-platforms";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const codingPlatformsRouter = createTRPCRouter({
  validatePlatformHandles: protectedProcedure
    .input(
      z.object({
        handles: z.record(z.string(), z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      return await validatePlatformHandles(input.handles);
    }),

  getPlatformScores: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    const profile = await ctx.db.profile.findUnique({
      where: {
        userId: currentUser.id,
      },
    });

    const { codechef, leetcode, codeforces, hackerrank, interviewbit } =
      profile?.professionalProfiles as Record<string, string>;

    const platformHandles = Object.fromEntries(
      Object.entries({
        codechef,
        leetcode,
        codeforces,
        hackerrank,
        interviewbit,
      }).filter(([_, value]) => value !== ""),
    ) as Record<string, string>;

    const result = await getPlatformScores(platformHandles);
    return { success: true, data: result };
  }),
});
