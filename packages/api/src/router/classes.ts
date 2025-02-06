import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { eq } from "drizzle-orm";
import { classes, videos, folders } from "@tutly/db/schema";
import { sql } from "drizzle-orm";

export const classesRouter = createTRPCRouter({
  createClass: protectedProcedure
    .input(
      z.object({
        classTitle: z.string().trim().min(1, {
          message: "Title is required",
        }),
        videoLink: z.string().nullable(),
        videoType: z.enum(["DRIVE", "YOUTUBE", "ZOOM"]),
        courseId: z.string().trim().min(1),
        createdAt: z.string().optional(),
        folderId: z.string().optional(),
        folderName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [video] = await ctx.db.insert(videos).values({
          videoLink: input.videoLink,
          videoType: input.videoType,
        }).returning();

        if (!video?.id) throw new Error("Failed to create video");

        const classData = {
          title: input.classTitle,
          createdAt: input.createdAt ? new Date(input.createdAt) : new Date(),
          videoId: video.id,
          courseId: input.courseId,
        };

        if (input.folderId) {
          const [newClass] = await ctx.db.insert(classes).values({
            ...classData,
            folderId: input.folderId,
          }).returning();
          return newClass;
        }

        if (input.folderName) {
          const [folder] = await ctx.db.insert(folders).values({
            title: input.folderName,
            createdAt: input.createdAt ? new Date(input.createdAt) : new Date(),
          }).returning();

          if (!folder?.id) throw new Error("Failed to create folder");

          const [newClass] = await ctx.db.insert(classes).values({
            ...classData,
            folderId: folder.id,
          }).returning();
          return newClass;
        }

        const [newClass] = await ctx.db.insert(classes).values(classData).returning();
        return newClass;
      } catch {
        throw new Error("Error creating class");
      }
    }),

  updateClass: protectedProcedure
    .input(
      z.object({
        classId: z.string(),
        courseId: z.string(),
        classTitle: z.string(),
        videoLink: z.string().nullable(),
        videoType: z.enum(["DRIVE", "YOUTUBE", "ZOOM"]),
        folderId: z.string().optional(),
        folderName: z.string().optional(),
        createdAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let newFolderId: string | undefined = input.folderId;

      if (input.folderId && input.folderName) {
        await ctx.db.update(folders)
          .set({
            title: input.folderName,
            createdAt: new Date(input.createdAt ?? ""),
          })
          .where(eq(folders.id, input.folderId));
      } else if (input.folderName) {
        const [folder] = await ctx.db.insert(folders).values({
          title: input.folderName,
          createdAt: new Date(input.createdAt ?? ""),
        }).returning();
        if (!folder?.id) throw new Error("Failed to create folder");
        newFolderId = folder.id;
      }

      try {
        const classData = await ctx.db.query.classes.findFirst({
          where: eq(classes.id, input.classId),
          columns: { videoId: true }
        });

        if (classData?.videoId) {
          await ctx.db.update(videos)
            .set({
              videoLink: input.videoLink,
              videoType: input.videoType,
            })
            .where(eq(videos.id, classData.videoId));
        }

        const [myClass] = await ctx.db.update(classes)
          .set({
            title: input.classTitle,
            createdAt: new Date(input.createdAt ?? ""),
            folderId: newFolderId,
          })
          .where(eq(classes.id, input.classId))
          .returning();

        return myClass;
      } catch {
        throw new Error("Failed to update class");
      }
    }),

  deleteClass: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.delete(classes)
          .where(eq(classes.id, input.classId));
        return { success: true };
      } catch {
        throw new Error("Failed to delete class");
      }
    }),

  totalNumberOfClasses: protectedProcedure.query(async ({ ctx }) => {
    const [res] = await ctx.db.select({ count: sql<number>`count(*)` })
      .from(classes);

    if (!res) throw new Error("Failed to get total number of classes");

    return res.count;
  }),

  getClassDetails: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const classData = await ctx.db.query.classes.findFirst({
        where: eq(classes.id, input.id),
        with: {
          video: true,
          attachments: true,
          folder: true,
        },
      });
      return classData;
    }),

  getClassesWithFolders: protectedProcedure
    .input(z.object({ courseId: z.string().trim().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.classes.findMany({
        where: eq(classes.courseId, input.courseId),
        with: { folder: true },
      });
    }),
});
