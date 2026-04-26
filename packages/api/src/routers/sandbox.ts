import { CodeSandbox } from "@codesandbox/sdk";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db } from "@tutly/db";

async function createTestSandbox(apiKey: string) {
  const sdk = new CodeSandbox(apiKey);
  const createdSandbox = await sdk.sandboxes.create();
  return { sdk, sandboxId: createdSandbox.id };
}

async function cleanupSandbox(sdk: any, sandboxId: string) {
  try {
    await sdk.sandboxes.hibernate(sandboxId);
  } catch {
    /* best-effort cleanup */
  }
  try {
    await sdk.sandboxes.shutdown(sandboxId);
  } catch {
    /* best-effort cleanup */
  }
}

export const sandboxRouter = createTRPCRouter({
  getSandboxPageData: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string().nullable(),
        submissionId: z.string().nullable(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      const submission = input.submissionId
        ? await ctx.db.submission.findUnique({
            where: { id: input.submissionId, status: "SUBMITTED" },
            include: {
              enrolledUser: { include: { user: true } },
              points: true,
              assignment: true,
            },
          })
        : null;

      const studentAccess =
        currentUser.role === "STUDENT" &&
        submission?.enrolledUser.username === currentUser.username;
      const mentorAccess =
        currentUser.role === "MENTOR" &&
        submission?.enrolledUser.mentorUsername === currentUser.username;
      const instructorAccess = currentUser.role === "INSTRUCTOR";

      if (input.submissionId && !studentAccess && !mentorAccess && !instructorAccess) {
        return { allowed: false as const };
      }

      const assignment = input.assignmentId
        ? await ctx.db.attachment.findUnique({
            where: { id: input.assignmentId, attachmentType: "ASSIGNMENT" },
          })
        : null;

      let decodedSandboxTemplate: unknown = null;
      if (assignment?.sandboxTemplate) {
        try {
          const decoded = Buffer.from(
            assignment.sandboxTemplate as string,
            "base64",
          ).toString("utf-8");
          decodedSandboxTemplate = JSON.parse(decoded);
        } catch {
          decodedSandboxTemplate = assignment.sandboxTemplate;
        }
      }

      return {
        allowed: true as const,
        submission,
        assignment: assignment
          ? { ...assignment, sandboxTemplate: decodedSandboxTemplate }
          : null,
        showActions: instructorAccess || mentorAccess,
        canEditTemplate:
          currentUser.role === "INSTRUCTOR" || currentUser.role === "ADMIN",
      };
    }),

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
