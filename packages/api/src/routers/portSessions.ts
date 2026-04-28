import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { defaultPreviewPorts } from "../lib/workspace-config";
import { requireAssignmentReadAccess } from "../lib/workspace-access";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const portSessionsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string().optional(),
        submissionId: z.string().optional(),
        status: z.enum(["OPEN", "CLOSED", "STALE"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;
      if (input.assignmentId) {
        await requireAssignmentReadAccess(ctx, input.assignmentId);
      }

      const sessions = await ctx.db.portSession.findMany({
        where: {
          userId: user.id,
          assignmentId: input.assignmentId,
          submissionId: input.submissionId,
          status: input.status,
        },
        orderBy: { updatedAt: "desc" },
      });

      return { success: true, data: sessions };
    }),

  open: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string(),
        submissionId: z.string().optional(),
        serviceConnectionId: z.string().optional(),
        provider: z.enum(["LOCAL", "SSH"]).default("LOCAL"),
        port: z.number().int().min(1).max(65535),
        targetUrl: z.string().url().optional(),
        metadata: z.any().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAssignmentReadAccess(ctx, input.assignmentId);

      const config = await ctx.db.assignmentConfig.findUnique({
        where: { assignmentId: input.assignmentId },
      });
      const allowedPorts =
        config?.previewPorts && config.previewPorts.length > 0
          ? config.previewPorts
          : defaultPreviewPorts;

      if (!allowedPorts.includes(input.port)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Port ${input.port} is not approved for this assignment.`,
        });
      }

      if (input.serviceConnectionId) {
        const connection = await ctx.db.serviceConnection.findFirst({
          where: {
            id: input.serviceConnectionId,
            userId: ctx.session.user.id,
            status: "ACTIVE",
          },
        });
        if (!connection) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Active service connection not found" });
        }
      }

      const proxyPath = `/preview/${input.port}/`;
      const session = await ctx.db.portSession.create({
        data: {
          userId: ctx.session.user.id,
          assignmentId: input.assignmentId,
          submissionId: input.submissionId ?? null,
          serviceConnectionId: input.serviceConnectionId ?? null,
          provider: input.provider,
          port: input.port,
          targetUrl: input.targetUrl ?? `http://localhost:${input.port}`,
          proxyPath,
          metadata: input.metadata ?? {},
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 6),
        },
      });

      return { success: true, data: session };
    }),

  close: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.portSession.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Port session not found" });
      }

      const updated = await ctx.db.portSession.update({
        where: { id: input.id },
        data: { status: "CLOSED" },
      });

      return { success: true, data: updated };
    }),
});

