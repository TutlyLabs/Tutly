import { TRPCError } from "@trpc/server";
import { jwtVerify } from "jose";
import { z } from "zod";

import { createLogger } from "@tutly/logger";

import { requireAssignmentReadAccess } from "../lib/authorization";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const logger = createLogger("api:vscode");

export const vscodeRouter = createTRPCRouter({
  resolveConfig: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string().nullable(),
        config: z.string().nullable(),
      }),
    )
    .query(async ({ ctx, input }) => {
      let assignmentId = input.assignmentId;
      let hasRunCommand = false;

      if (input.config) {
        const secret = process.env.TUTLY_VSCODE_SECRET;
        if (!secret) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "VS Code config secret not configured",
          });
        }

        let decoded: {
          assignmentId?: string;
          tutlyConfig?: {
            run?: { command?: string };
            dev?: { command?: string };
          };
        };
        try {
          const { payload } = await jwtVerify(
            input.config,
            new TextEncoder().encode(secret),
          );
          decoded = payload as typeof decoded;
        } catch (error) {
          // Previously this only flipped an `isAuthorized` flag and the assignment
          // was still returned, so an unsigned config token read like a valid one.
          logger.error({ err: error }, "failed to verify vscode config param");
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid VS Code config token",
          });
        }

        if (decoded.assignmentId && !assignmentId) {
          assignmentId = decoded.assignmentId;
        }
        if (
          decoded.tutlyConfig?.run?.command ??
          decoded.tutlyConfig?.dev?.command
        ) {
          hasRunCommand = true;
        }
      }

      let assignment: {
        id: string;
        title: string;
        class: { course: { title: string } | null } | null;
      } | null = null;

      if (assignmentId) {
        // The id can come straight from input, so the caller's own access decides.
        await requireAssignmentReadAccess(ctx, assignmentId);
        assignment = await ctx.db.attachment.findUnique({
          where: { id: assignmentId },
          select: {
            id: true,
            title: true,
            class: { select: { course: { select: { title: true } } } },
          },
        });
      }

      return { assignment, assignmentId, hasRunCommand, isAuthorized: true };
    }),
});
