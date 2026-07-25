import { CodeSandbox } from "@codesandbox/sdk";
import {
  readSandpackTemplate,
  readSubmission,
  type Locator,
} from "@tutly/storage";
import { z } from "zod";

import { locatorFrom, locatorSelect } from "../lib/storage-locator";
import {
  mergeForAudience,
  type SandpackTemplate,
} from "../lib/template-policy";

import { createTRPCRouter, protectedProcedure } from "../trpc";
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

      // Fall back to submission.attachmentId so ?submissionId=... works.
      const fallbackAssignmentId = submission?.attachmentId ?? null;
      const assignmentRaw =
        input.assignmentId || fallbackAssignmentId
          ? await ctx.db.attachment.findUnique({
              where: {
                id: (input.assignmentId ?? fallbackAssignmentId)!,
                attachmentType: "ASSIGNMENT",
              },
            })
          : null;
      // Legacy hiddenTestFiles column — strip from response (now merged into template).
      const assignment = assignmentRaw
        ? (() => {
            const { hiddenTestFiles: _stale, ...rest } =
              assignmentRaw as Record<string, unknown> & {
                hiddenTestFiles?: unknown;
              };
            void _stale;
            return rest as typeof assignmentRaw;
          })()
        : null;

      const canEditTemplate =
        currentUser.role === "INSTRUCTOR" || currentUser.role === "ADMIN";

      let decodedSandboxTemplate: SandpackTemplate | null = null;
      const resolvedAssignmentId =
        input.assignmentId ?? submission?.attachmentId ?? null;
      let locator: Locator | null = null;
      if (resolvedAssignmentId) {
        const locRow = await ctx.db.attachment.findUnique({
          where: { id: resolvedAssignmentId },
          select: locatorSelect,
        });
        if (locRow) locator = locatorFrom(locRow);
      }
      if (locator) {
        // Storage returns the loosely-typed on-disk shape; this is the single
        // deserialization boundary where it becomes a SandpackTemplate.
        decodedSandboxTemplate = (await readSandpackTemplate(
          locator,
        )) as SandpackTemplate | null;
      }

      let resolvedSubmission = submission as
        | (typeof submission & { data?: unknown })
        | null;
      let submissionFiles: Record<string, string> | null = null;
      if (resolvedSubmission && locator) {
        submissionFiles = await readSubmission(locator, resolvedSubmission.id);
        if (submissionFiles) {
          resolvedSubmission = { ...resolvedSubmission, data: submissionFiles };
        }
      }

      const audience: "student" | "instructor" = canEditTemplate
        ? "instructor"
        : "student";
      if (decodedSandboxTemplate && typeof decodedSandboxTemplate === "object") {
        decodedSandboxTemplate = mergeForAudience(
          decodedSandboxTemplate,
          submissionFiles,
          audience,
        );
        if (resolvedSubmission) {
          const merged = decodedSandboxTemplate.files ?? {};
          resolvedSubmission = { ...resolvedSubmission, data: merged };
        }
      }

      return {
        allowed: true as const,
        submission: resolvedSubmission,
        assignment: assignment
          ? { ...assignment, sandboxTemplate: decodedSandboxTemplate }
          : null,
        showActions: instructorAccess || mentorAccess,
        canEditTemplate,
      };
    }),

  // Provisions real third-party compute from a caller-supplied key: authenticated only.
  createSandbox: protectedProcedure
    .input(z.object({ apiKey: z.string() }))
    .mutation(async ({ input }) => {
      const { apiKey } = input;

      try {
        // `sdk` is deliberately not returned: serializing it leaks the API key.
        const { sandboxId } = await createTestSandbox(apiKey);
        return {
          ok: true,
          sandboxId,
        };
      } catch (error) {
        return {
          ok: false,
          error: `Sandbox Creation failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }),

  checkReadPermission: protectedProcedure
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

  checkEditPermission: protectedProcedure
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

  checkVMManagePermission: protectedProcedure
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

  cleanupTestSandbox: protectedProcedure
    .input(z.object({ apiKey: z.string(), sandboxId: z.string() }))
    .mutation(async ({ input }) => {
      const { apiKey, sandboxId } = input;

      try {
        const sdk = new CodeSandbox(apiKey);
        await cleanupSandbox(sdk, sandboxId);
        return { ok: true };
      } catch {
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
