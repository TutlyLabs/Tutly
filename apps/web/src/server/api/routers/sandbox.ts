import { CodeSandbox } from "@codesandbox/sdk";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db } from "@/lib/db";

async function createTestSandbox(apiKey: string) {
  const sdk = new CodeSandbox(apiKey);
  const createdSandbox = await sdk.sandboxes.create();
  return { sdk, sandboxId: createdSandbox.id };
}

async function cleanupSandbox(sdk: any, sandboxId: string) {
  try {
    await sdk.sandboxes.hibernate(sandboxId);
  } catch {}
  try {
    await sdk.sandboxes.shutdown(sandboxId);
  } catch {}
}

export const sandboxRouter = createTRPCRouter({
  createSandbox: publicProcedure
    .input(z.object({ apiKey: z.string() }))
    .mutation(async ({ input }) => {
      const { apiKey } = input;

      try {
        const { sdk, sandboxId } = await createTestSandbox(apiKey);
        return {
          ok: true,
          sandboxId,
          sdk: JSON.stringify(sdk),
        };
      } catch (error) {
        return {
          ok: false,
          error: `Sandbox Creation failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }),

  checkReadPermission: publicProcedure
    .input(z.object({ apiKey: z.string() }))
    .mutation(async ({ input }) => {
      const { apiKey } = input;

      try {
        const sdk = new CodeSandbox(apiKey);
        await sdk.sandboxes.list();
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: `Sandbox Read failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }),

  checkEditPermission: publicProcedure
    .input(z.object({ apiKey: z.string(), sandboxId: z.string() }))
    .mutation(async ({ input }) => {
      const { apiKey, sandboxId } = input;

      try {
        const sdk = new CodeSandbox(apiKey);
        const sandbox = await sdk.sandboxes.resume(sandboxId);
        const client = await sandbox.connect();
        await client.fs.writeTextFile("/README.md", "# Permission check");
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: `Sandbox Edit failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }),

  checkVMManagePermission: publicProcedure
    .input(z.object({ apiKey: z.string(), sandboxId: z.string() }))
    .mutation(async ({ input }) => {
      const { apiKey, sandboxId } = input;

      try {
        const sdk = new CodeSandbox(apiKey);
        await sdk.sandboxes.restart(sandboxId);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: `VM Manage failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }),

  cleanupTestSandbox: publicProcedure
    .input(z.object({ apiKey: z.string(), sandboxId: z.string() }))
    .mutation(async ({ input }) => {
      const { apiKey, sandboxId } = input;

      try {
        const sdk = new CodeSandbox(apiKey);
        await cleanupSandbox(sdk, sandboxId);
        return { ok: true };
      } catch (error) {
        return { ok: false };
      }
    }),

  saveCodesandboxAccount: protectedProcedure
    .input(z.object({ apiKey: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { apiKey } = input;
      const currentUser = ctx.session.user;

      const providerId = "codesandbox";
      const accountId = "codesandbox";
      const data = {
        userId: currentUser.id,
        providerId,
        accountId,
        accessToken: apiKey,
        scope: "create,read,edit,vmManage",
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

  createSandboxWithSession: protectedProcedure
    .input(
      z.object({
        template: z.string(),
        templateName: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { template, templateName } = input;
      const currentUser = ctx.session.user;

      const account = await db.account.findFirst({
        where: {
          userId: currentUser.id,
          providerId: "codesandbox",
        },
      });

      if (!account?.accessToken) {
        return {
          ok: false,
          error:
            "CodeSandbox API key not found. Please set up your CodeSandbox integration first.",
          redirectTo: "/integrations",
        };
      }

      try {
        const sdk = new CodeSandbox(account.accessToken);
        const sandbox = await sdk.sandboxes.create({
          id: template,
          title: `${templateName} Playground`,
          privacy: "unlisted",
        });

        return {
          ok: true,
          sandboxId: sandbox.id,
          sandboxUrl: `https://codesandbox.io/s/${sandbox.id}`,
        };
      } catch (error) {
        return {
          ok: false,
          error: `Failed to create sandbox: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }),
});
