import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const featureFlagsRouter = createTRPCRouter({
  isEnabled: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const flag = await ctx.db.featureFlag.findUnique({
          where: { key: input.key },
        });
        if (!flag) return false;
        const allowedRoles = flag.allowedRoles as string[] | undefined;
        const userRole = ctx.session?.user?.role ?? "STUDENT";
        const roleAllowed =
          !allowedRoles ||
          allowedRoles.length === 0 ||
          allowedRoles.includes(userRole);
        return Boolean(flag.enabled && roleAllowed);
      } catch {
        return false;
      }
    }),
});
