import { z } from "zod";

import {
  getPlatformScores,
  validatePlatformHandles,
  type PlatformScores,
} from "../lib/coding-platforms";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const codingPlatformsRouter = createTRPCRouter({
  // Coding profiles scoped to the viewer's cohort:
  //   STUDENT  → other students sharing their mentor in any course they're in, + their mentors, + themselves
  //   MENTOR   → their mentees + themselves
  //   ADMIN / INSTRUCTOR → everyone in the org
  // Non-privileged viewers also respect the target user's `isProfilePublic` flag.
  getOrgCodingProfiles: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;
    const orgId = currentUser.organizationId;
    const isPrivileged =
      currentUser.role === "INSTRUCTOR" || currentUser.role === "ADMIN";

    // Resolve the set of usernames this viewer is allowed to see.
    let allowedUsernames: Set<string> | null = null; // null = no restriction

    if (!isPrivileged) {
      const allowed = new Set<string>([currentUser.username]);

      if (currentUser.role === "MENTOR") {
        const mentees = await ctx.db.enrolledUsers.findMany({
          where: { mentorUsername: currentUser.username },
          select: { username: true },
        });
        for (const m of mentees) allowed.add(m.username);
      } else if (currentUser.role === "STUDENT") {
        const myEnrollments = await ctx.db.enrolledUsers.findMany({
          where: { username: currentUser.username },
          select: { courseId: true, mentorUsername: true },
        });
        const cohortKeys = myEnrollments
          .filter((e) => e.courseId && e.mentorUsername)
          .map((e) => ({
            courseId: e.courseId!,
            mentorUsername: e.mentorUsername!,
          }));
        for (const e of myEnrollments) {
          if (e.mentorUsername) allowed.add(e.mentorUsername);
        }
        if (cohortKeys.length > 0) {
          const cohortPeers = await ctx.db.enrolledUsers.findMany({
            where: { OR: cohortKeys },
            select: { username: true },
          });
          for (const p of cohortPeers) allowed.add(p.username);
        }
      }

      allowedUsernames = allowed;
    }

    const profiles = await ctx.db.profile.findMany({
      where: {
        user: {
          organizationId: orgId ?? undefined,
          ...(allowedUsernames
            ? { username: { in: Array.from(allowedUsernames) } }
            : {}),
          ...(isPrivileged ? {} : { isProfilePublic: true }),
        },
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
