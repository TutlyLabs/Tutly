import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  attachments,
  attachmentTypeEnum,
  submissionModeEnum,
} from "@tutly/db/schema";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const attachmentsRouter = createTRPCRouter({
  createAttachment: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        details: z.string().optional(),
        link: z.string().optional(),
        dueDate: z.date().optional(),
        attachmentType: z.enum(attachmentTypeEnum.enumValues),
        courseId: z.string(),
        classId: z.string(),
        maxSubmissions: z.number().optional(),
        submissionMode: z.enum(submissionModeEnum.enumValues),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const attachment = await ctx.db
          .insert(attachments)
          .values({
            title: input.title,
            classId: input.classId,
            link: input.link ?? null,
            details: input.details ?? null,
            attachmentType: input.attachmentType,
            submissionMode: input.submissionMode,
            dueDate: input.dueDate ?? null,
            courseId: input.courseId,
            maxSubmissions: input.maxSubmissions ?? null,
          })
          .returning();

        return { success: true, data: attachment };
      } catch {
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
      const attachment = await ctx.db.query.attachments.findFirst({
        where: (attachments, { eq }) => eq(attachments.id, input.id),
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
      const attachment = await ctx.db
        .delete(attachments)
        .where(eq(attachments.id, input.id))
        .returning();

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
        submissionMode: z.enum(["HTML_CSS_JS", "REACT", "EXTERNAL_LINK"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const attachment = await ctx.db
          .update(attachments)
          .set({
            title: input.title,
            classId: input.classId,
            link: input.link ?? null,
            details: input.details ?? null,
            attachmentType: input.attachmentType,
            submissionMode: input.submissionMode,
            dueDate: input.dueDate ?? null,
            courseId: input.courseId,
            maxSubmissions: input.maxSubmissions ?? null,
          })
          .where(eq(attachments.id, input.id))
          .returning();

        return { success: true, data: attachment };
      } catch {
        return { error: "Failed to update attachment" };
      }
    }),
});
