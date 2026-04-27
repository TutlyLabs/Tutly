import { z } from "zod";

import {
  getPlatformScores,
  validatePlatformHandles,
  type PlatformScores,
} from "../lib/coding-platforms";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const codingPlatformsRouter = createTRPCRouter({
  // Get all org members who have configured coding platform handles
  getOrgCodingProfiles: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.session.user.organizationId;
    const profiles = await ctx.db.profile.findMany({
      where: {
        user: { organizationId: orgId ?? undefined },
      },
      select: {
        userId: true,
        professionalProfiles: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            role: true,
          },
        },
      },
    });

    const CODING_PLATFORMS = ["leetcode", "codeforces", "codechef", "hackerrank", "interviewbit"] as const;

    return profiles
      .map((p) => {
        const handles = (p.professionalProfiles as Record<string, string> | null) ?? {};
        const configured = CODING_PLATFORMS.filter((pl) => !!handles[pl]);
        if (configured.length === 0) return null;
        return {
          user: p.user,
          handles: Object.fromEntries(configured.map((pl) => [pl, handles[pl]])) as Record<string, string>,
          configuredCount: configured.length,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.configuredCount - a!.configuredCount) as Array<{
        user: { id: string; name: string | null; username: string; image: string | null; role: string };
        handles: Record<string, string>;
        configuredCount: number;
      }>;
  }),

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

    const professionalProfiles = profile?.professionalProfiles as
      | Record<string, string>
      | undefined;

    if (!professionalProfiles) {
      const emptyPlatformScores: PlatformScores = {
        totalScore: 0,
        percentages: {},
        codechef: null,
        leetcode: null,
        codeforces: null,
        hackerrank: null,
        interviewbit: null,
      };
      return {
        success: true,
        data: emptyPlatformScores,
      };
    }

    const { codechef, leetcode, codeforces, hackerrank, interviewbit } =
      professionalProfiles;

    const platformHandles = Object.fromEntries(
      Object.entries({
        codechef,
        leetcode,
        codeforces,
        hackerrank,
        interviewbit,
      }).filter(([, value]) => value !== ""),
    ) as Record<string, string>;

    const result = await getPlatformScores(platformHandles);
    return { success: true, data: result };
  }),
});
