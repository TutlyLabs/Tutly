import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db } from "@/lib/db";

export const geminiRouter = createTRPCRouter({
  validateApiKey: publicProcedure
    .input(z.object({ apiKey: z.string() }))
    .mutation(async ({ input }) => {
      const { apiKey } = input;

      try {
        console.log("apiKey", apiKey);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          const errorData = await response.text();
          return {
            ok: false,
            error: `API key validation failed: ${response.status} ${response.statusText}. ${errorData}`,
          };
        }

        const data = await response.json();

        if (!data.models || !Array.isArray(data.models)) {
          return {
            ok: false,
            error: "API key validation failed: No models found in response",
          };
        }

        const modelNames = data.models
          .map(
            (model: any) =>
              model.name?.replace("models/", "") || model.displayName,
          )
          .filter(Boolean);

        return {
          ok: true,
          modelsCount: data.models.length,
          models: modelNames,
        };
      } catch (error) {
        return {
          ok: false,
          error: `API key validation failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }),

  saveGeminiAccount: protectedProcedure
    .input(z.object({ apiKey: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { apiKey } = input;
      const currentUser = ctx.session.user;

      const providerId = "gemini";
      const accountId = "gemini";
      const data = {
        userId: currentUser.id,
        providerId,
        accountId,
        accessToken: apiKey,
        scope: "generate",
      };

      await db.account.upsert({
        where: {
          id: `${providerId}_${accountId}_${currentUser.id}`,
        },
        update: data,
        create: data,
      });

      return { ok: true };
    }),
});
