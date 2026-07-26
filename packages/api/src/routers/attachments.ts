import type { attachmentType, submissionMode } from "@tutly/db/browser";
import { TRPCError } from "@trpc/server";
import { writeSandpackTemplate } from "@tutly/storage";
import { z } from "zod";

import { sandpackTemplateSchema } from "../lib/sandpack-template-schema";
import { createLogger } from "@tutly/logger";

import { locatorFrom, locatorSelect } from "../lib/storage-locator";

import { createTRPCRouter, permissionProcedure, protectedProcedure } from "../trpc";
import {
  requireAssignmentManageAccess,
  requireAssignmentReadAccess,
  requireClassManageAccess,
  requireCourseManageAccess,
} from "../lib/authorization";

const logger = createLogger("api:attachments");

export const attachmentsRouter = createTRPCRouter({
  createAttachment: permissionProcedure("assignment", "create")
    .input(
      z.object({
        title: z.string(),
        details: z.string().optional(),
        detailsJson: z.any().optional(),
        link: z.string().optional(),
        dueDate: z.date().optional(),
        attachmentType: z.enum([
          "ASSIGNMENT",
          "GITHUB",
          "ZOOM",
          "OTHERS",
        ] as const),
        courseId: z.string().optional(),
        classId: z.string().optional(),
        maxSubmissions: z.number().optional(),
        submissionMode: z.enum([
          "HTML_CSS_JS",
          "REACT",
          "EXTERNAL_LINK",
          "SANDBOX",
          "WORKSPACE",
          "GIT",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      // The role grant alone does not say *which* course may be written to.
      if (input.courseId) await requireCourseManageAccess(ctx, input.courseId);
      if (input.classId) await requireClassManageAccess(ctx, input.classId);

      try {
        const attachment = await ctx.db.attachment.create({
          data: {
            title: input.title,
            classId: input.classId ?? null,
            link: input.link ?? null,
            details: input.details ?? null,
            detailsJson: input.detailsJson ?? null,
            attachmentType: input.attachmentType as attachmentType,
            submissionMode: input.submissionMode as submissionMode,
            dueDate: input.dueDate ?? null,
            courseId: input.courseId ?? null,
            maxSubmissions: input.maxSubmissions ?? null,
          },
        });

        // Post activity to course chat group (fire-and-forget)
        if (input.attachmentType === "ASSIGNMENT" && input.courseId) {
          const group = await ctx.db.chatGroup.findFirst({
            where: { courseId: input.courseId, type: "COURSE" },
          });
          if (group) {
            await ctx.db.message.create({
              data: {
                groupId: group.id,
                senderId: currentUser.id,
                content: `📝 New assignment: ${input.title}${input.dueDate ? ` · Due ${input.dueDate.toLocaleDateString()}` : ""}`,
                type: "ACTIVITY",
                metadata: { event: "ASSIGNMENT_CREATED", attachmentId: attachment.id },
              },
            });
          }
        }

        return { success: true, data: attachment };
      } catch (error) {
        logger.error({ err: error, courseId: input.courseId }, "failed to create attachment");
        return { error: "Failed to create attachment" };
      }
    }),

  getAttachmentByID: permissionProcedure("assignment", "read")
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireAssignmentReadAccess(ctx, input.id);
      const attachment = await ctx.db.attachment.findUnique({
        where: { id: input.id },
      });

      return {
        success: true,
        data: attachment,
      };
    }),

  deleteAttachment: permissionProcedure("assignment", "delete")
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAssignmentManageAccess(ctx, input.id);

      const attachment = await ctx.db.attachment.delete({
        where: {
          id: input.id,
        },
      });

      return {
        success: true,
        data: attachment,
      };
    }),

  updateAttachment: permissionProcedure("assignment", "update")
    .input(
      z.object({
        id: z.string(),
        title: z.string(),
        details: z.string().optional(),
        detailsJson: z.any().optional(),
        link: z.string().optional(),
        dueDate: z.date().optional(),
        attachmentType: z.enum([
          "ASSIGNMENT",
          "GITHUB",
          "ZOOM",
          "OTHERS",
        ] as const),
        courseId: z.string().optional(),
        classId: z.string().optional(),
        maxSubmissions: z.number().optional(),
        submissionMode: z.enum([
          "HTML_CSS_JS",
          "REACT",
          "EXTERNAL_LINK",
          "SANDBOX",
          "WORKSPACE",
          "GIT",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAssignmentManageAccess(ctx, input.id);
      // Re-targeting an attachment needs manage rights on the destination too.
      if (input.courseId) await requireCourseManageAccess(ctx, input.courseId);
      if (input.classId) await requireClassManageAccess(ctx, input.classId);

      try {
        const attachment = await ctx.db.attachment.update({
          where: {
            id: input.id,
          },
          data: {
            title: input.title,
            classId: input.classId ?? null,
            link: input.link ?? null,
            details: input.details ?? null,
            detailsJson: input.detailsJson ?? null,
            attachmentType: input.attachmentType as attachmentType,
            submissionMode: input.submissionMode as submissionMode,
            dueDate: input.dueDate ?? null,
            courseId: input.courseId ?? null,
            maxSubmissions: input.maxSubmissions ?? null,
          },
        });

        return { success: true, data: attachment };
      } catch (error) {
        logger.error({ err: error, attachmentId: input.id }, "failed to update attachment");
        return { error: "Failed to update attachment" };
      }
    }),

  getCourseAssignments: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user;

        const enrolledUser = await ctx.db.enrolledUsers.findFirst({
          where: {
            username: currentUser.username,
            courseId: input.courseId,
          },
        });

        if (!enrolledUser) {
          return { success: true, data: [] };
        }

        const assignments = await ctx.db.attachment.findMany({
          where: {
            courseId: input.courseId,
            attachmentType: "ASSIGNMENT",
          },
          include: {
            submissions: {
              where: {
                enrolledUserId: enrolledUser.id,
                status: "SUBMITTED",
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return { success: true, data: assignments };
      } catch (error) {
        logger.error({ err: error, courseId: input.courseId }, "failed to get course assignments");
        return { error: "Failed to get course assignments" };
      }
    }),
  // Writes the starter/hidden-test payload for an assignment, so it must be
  // gated exactly like any other assignment mutation — otherwise a student can
  // overwrite the hidden tests they are graded against.
  updateAttachmentSandboxTemplate: permissionProcedure(
    "workspace",
    "uploadStarter",
  )
    .input(
      z.object({
        id: z.string(),
        sandboxTemplate: z.any(),
      }),
    )
    .mutation(async ({ ctx, input: { id, sandboxTemplate } }) => {
      await requireAssignmentManageAccess(ctx, id);

      const parsed = sandpackTemplateSchema.safeParse(sandboxTemplate);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        const path = first?.path?.join(".") ?? "(root)";
        return {
          error: `Invalid tutly.json at ${path}: ${first?.message ?? "schema mismatch"}`,
        };
      }
      const existing = await ctx.db.attachment.findUnique({
        where: { id },
        select: locatorSelect,
      });
      if (!existing) return { error: "Not found" };

      await writeSandpackTemplate(locatorFrom(existing), parsed.data);
      const attachment = await ctx.db.attachment.update({
        where: { id },
        data: { updatedAt: new Date() },
        select: { id: true, updatedAt: true },
      });
      return { success: true as const, data: attachment };
    }),

  // `courseId` is now required: without it the query spanned every tenant's
  // unlinked assignments, and Attachment carries no owner to scope it by.
  getUnlinkedAssignments: permissionProcedure("assignment", "link")
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireCourseManageAccess(ctx, input.courseId);

      const assignments = await ctx.db.attachment.findMany({
        where: {
          attachmentType: "ASSIGNMENT",
          classId: null,
          OR: [{ courseId: input.courseId }, { courseId: null }],
        },
        include: {
          course: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return { success: true, data: assignments };
    }),

  linkAssignmentToClass: permissionProcedure("assignment", "link")
    .input(
      z.object({
        attachmentId: z.string(),
        classId: z.string(),
        courseId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAssignmentManageAccess(ctx, input.attachmentId);
      await requireCourseManageAccess(ctx, input.courseId);
      const cls = await requireClassManageAccess(ctx, input.classId);
      if (cls.courseId !== input.courseId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Class does not belong to that course",
        });
      }

      const attachment = await ctx.db.attachment.update({
        where: { id: input.attachmentId },
        data: {
          classId: input.classId,
          courseId: input.courseId,
        },
      });

      return { success: true, data: attachment };
    }),
});
