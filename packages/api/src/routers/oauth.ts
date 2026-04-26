import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { db } from "@tutly/db";

function maskToken(token: string | null | undefined): string | null {
  if (!token) return null;
  if (token.length > 6) return token.slice(0, 7) + "*".repeat(25) + token.slice(-3);
  return "*".repeat(token.length);
}

export const oauthRouter = createTRPCRouter({
  getAccounts: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const accounts = await db.account.findMany({
      where: {
        userId,
        providerId: { in: ["codesandbox", "github", "google", "zoom", "gemini"] },
      },
    });

    const byProvider = (id: string) => {
      const acc = accounts.find((a) => a.providerId === id);
      if (!acc) return undefined;
      if (id === "codesandbox" || id === "gemini") {
        return { ...acc, accessToken: maskToken(acc.accessToken) };
      }
      return acc;
    };

    return {
      sandbox: byProvider("codesandbox"),
      github: byProvider("github"),
      google: byProvider("google"),
      zoom: byProvider("zoom"),
      gemini: byProvider("gemini"),
    };
  }),

  getFlagPayload: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const flag = await db.featureFlag.findUnique({
        where: { key: input.key },
        select: { payload: true },
      });
      return (flag?.payload as Record<string, boolean> | null) ?? null;
    }),

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
