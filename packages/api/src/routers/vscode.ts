import { z } from "zod";
import { jwtVerify } from "jose";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const vscodeRouter = createTRPCRouter({
  resolveConfig: protectedProcedure
    .input(z.object({ assignmentId: z.string().nullable(), config: z.string().nullable() }))
    .query(async ({ ctx, input }) => {
      let assignmentId = input.assignmentId;
      let hasRunCommand = false;
      let isAuthorized = true;

      if (input.config) {
        try {
          const secret = new TextEncoder().encode(process.env.TUTLY_VSCODE_SECRET);
          const { payload } = await jwtVerify(input.config, secret);
          const decoded = payload as Record<string, unknown> & {
            assignmentId?: string;
            tutlyConfig?: { run?: { command?: string } };
          };
          if (decoded.assignmentId && !assignmentId) {
            assignmentId = decoded.assignmentId;
          }
          if (decoded.tutlyConfig?.run?.command) hasRunCommand = true;
        } catch (error) {
          console.error("Failed to verify config param:", error);
          isAuthorized = false;
        }
      }

      let assignment: {
        id: string;
        title: string;
        class: { course: { title: string } | null } | null;
      } | null = null;

      if (assignmentId) {
        try {
          assignment = await ctx.db.attachment.findUnique({
            where: { id: assignmentId },
            select: {
              id: true,
              title: true,
              class: { select: { course: { select: { title: true } } } },
            },
          });
        } catch (error) {
          console.error("Failed to fetch assignment:", error);
        }
      }

      return { assignment, assignmentId, hasRunCommand, isAuthorized };
    }),
});
