import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const featureFlagsRouter = createTRPCRouter({
  /**
   * Stays public: the signed-out layout gates the Google/GitHub buttons on it.
   * Returns a bare boolean for an exact key, so it leaks no flag names, payloads
   * or the flag set itself; an unknown key is indistinguishable from a disabled one.
   */
  isEnabled: publicProcedure
    .input(z.object({ key: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      try {
        const flag = await ctx.db.featureFlag.findUnique({
          where: { key: input.key },
          select: { enabled: true, allowedRoles: true },
        });
        if (!flag?.enabled) return false;

        const allowedRoles = flag.allowedRoles as string[] | undefined;
        // Role-restricted flags are never enabled for an anonymous caller; an
        // unauthenticated request used to be evaluated as if it were a STUDENT.
        if (!allowedRoles || allowedRoles.length === 0) return true;
        const userRole = ctx.session?.user?.role;
        return Boolean(userRole && allowedRoles.includes(userRole));
      } catch {
        return false;
      }
    }),
});
