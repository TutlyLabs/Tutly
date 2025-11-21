import type { attachmentType, submissionMode } from "@prisma/client";
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
        courseId: z.string(),
        classId: z.string(),
        maxSubmissions: z.number().optional(),
        submissionMode: z.enum([
          "HTML_CSS_JS",
          "REACT",
          "EXTERNAL_LINK",
          "SANDBOX",
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
            classId: input.classId,
            link: input.link ?? null,
            details: input.details ?? null,
            detailsJson: input.detailsJson ?? null,
            attachmentType: input.attachmentType as attachmentType,
            submissionMode: input.submissionMode as submissionMode,
            dueDate: input.dueDate ?? null,
            courseId: input.courseId,
            maxSubmissions: input.maxSubmissions ?? null,
          },
        });

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
        courseId: z.string(),
        classId: z.string(),
        maxSubmissions: z.number().optional(),
        submissionMode: z.enum([
          "HTML_CSS_JS",
          "REACT",
          "EXTERNAL_LINK",
          "SANDBOX",
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
            classId: input.classId,
            link: input.link ?? null,
            details: input.details ?? null,
            detailsJson: input.detailsJson ?? null,
            attachmentType: input.attachmentType as attachmentType,
            submissionMode: input.submissionMode as submissionMode,
            dueDate: input.dueDate ?? null,
            courseId: input.courseId,
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
});
