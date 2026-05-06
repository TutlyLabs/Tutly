import type { attachmentType, submissionMode } from "@tutly/db/browser";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const attachmentsRouter = createTRPCRouter({
  createAttachment: protectedProcedure
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
      try {
        const currentUser = ctx.session.user;
        if (currentUser.role !== "INSTRUCTOR") {
          return { error: "Unauthorized" };
        }

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
        console.error("Error creating attachment:", error);
        return { error: "Failed to create attachment" };
      }
    }),

  getAttachmentByID: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const attachment = await ctx.db.attachment.findUnique({
        where: {
          id: input.id,
        },
      });

      return {
        success: true,
        data: attachment,
      };
    }),

  deleteAttachment: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      if (currentUser.role !== "INSTRUCTOR") {
        return { error: "You must be an instructor to delete an attachment" };
      }

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

  updateAttachment: protectedProcedure
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
      try {
        const currentUser = ctx.session.user;
        if (currentUser.role !== "INSTRUCTOR") {
          return { error: "Unauthorized" };
        }

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
        console.error("Error updating attachment:", error);
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
        console.error("Error getting course assignments:", error);
        return { error: "Failed to get course assignments" };
      }
    }),
  updateAttachmentSandboxTemplate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        sandboxTemplate: z.any(),
      }),
    )
    .mutation(async ({ ctx, input: { id, sandboxTemplate } }) => {
      const templateString = JSON.stringify(sandboxTemplate);
      const base64Template = Buffer.from(templateString, "utf-8").toString(
        "base64",
      );

      const attachment = await ctx.db.attachment.update({
        where: { id },
        data: {
          sandboxTemplate: base64Template,
        },
      });

      return { success: true, data: attachment };
    }),

  getUnlinkedAssignments: protectedProcedure
    .input(
      z.object({
        courseId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      if (currentUser.role !== "INSTRUCTOR") {
        return { success: false, error: "Unauthorized", data: [] };
      }

      const assignments = await ctx.db.attachment.findMany({
        where: {
          attachmentType: "ASSIGNMENT",
          classId: null,
          ...(input.courseId
            ? { OR: [{ courseId: input.courseId }, { courseId: null }] }
            : {}),
        },
        include: {
          course: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return { success: true, data: assignments };
    }),

  linkAssignmentToClass: protectedProcedure
    .input(
      z.object({
        attachmentId: z.string(),
        classId: z.string(),
        courseId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      if (currentUser.role !== "INSTRUCTOR") {
        return { success: false, error: "Unauthorized" };
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
