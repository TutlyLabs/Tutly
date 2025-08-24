import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const classData = {
          title: input.classTitle,
          createdAt: input.createdAt ? new Date(input.createdAt) : new Date(),
          video: {
            create: {
              videoLink: input.videoLink ?? null,
              videoType: input.videoType,
            },
          },
          course: {
            connect: {
              id: input.courseId,
            },
          },
        };

        if (input.folderId) {
          return await ctx.db.class.create({
            data: {
              ...classData,
              Folder: {
                connect: {
                  id: input.folderId,
                },
              },
            },
          });
        } else if (input.folderName) {
          return await ctx.db.class.create({
            data: {
              ...classData,
              Folder: {
                create: {
                  title: input.folderName,
                  createdAt: input.createdAt
                    ? new Date(input.createdAt)
                    : new Date(),
                },
              },
            },
          });
        }

        return await ctx.db.class.create({
          data: classData,
        });
      } catch (error) {
        console.error("Error creating class:", error);
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      const isCourseAdmin = currentUser.adminForCourses.some(
        (course: { id: string }) => course.id === input.courseId,
      );

      if (currentUser.role !== "INSTRUCTOR" && !isCourseAdmin) {
        throw new Error("You are not authorized to update this class.");
      }

      try {
        // First get the existing class
        const existingClass = await ctx.db.class.findUnique({
          where: { id: input.classId },
          include: { video: true },
        });

        if (!existingClass) {
          throw new Error("Class not found");
        }

        // Update video
        await ctx.db.video.update({
          where: { id: existingClass.video.id },
          data: {
            videoLink: input.videoLink ?? null,
            videoType: input.videoType,
          },
        });

        // Handle folder logic
        let finalFolderId: string | null = null;

        if (input.folderName) {
          // Create new folder
          const newFolder = await ctx.db.folder.create({
            data: {
              title: input.folderName,
              createdAt: new Date(input.createdAt ?? new Date()),
            },
          });
          finalFolderId = newFolder.id;
        } else if (input.folderId) {
          // Use existing folder
          finalFolderId = input.folderId;
        }
        // If neither folderName nor folderId is provided, finalFolderId remains null

        const updatedClass = await ctx.db.class.update({
          where: { id: input.classId },
          data: {
            title: input.classTitle,
            createdAt: new Date(input.createdAt ?? new Date()),
            folderId: finalFolderId,
          },
          include: {
            video: true,
            Folder: true,
          },
        });

        return { success: true, data: updatedClass };
      } catch (error) {
        console.error("Error updating class:", error);
        return { error: "Failed to update class" };
      }
    }),

  deleteClass: protectedProcedure
    .input(
      z.object({
        classId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.class.delete({
          where: {
            id: input.classId,
          },
        });
        return { success: true };
      } catch (error) {
        console.error("Error deleting class:", error);
        throw new Error("Failed to delete class. Please try again later.");
      }
    }),

  totalNumberOfClasses: protectedProcedure.query(async ({ ctx }) => {
    try {
      const res = await ctx.db.class.count();
      return res;
    } catch (error) {
      console.error("Error getting total number of classes:", error);
      throw new Error(
        "Failed to get total number of classes. Please try again later.",
      );
    }
  }),

  getClassesByCourseId: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const classes = await ctx.db.class.findMany({
          where: {
            courseId: input.courseId,
          },
          include: {
            video: true,
            Folder: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        return { success: true, data: classes };
      } catch (error) {
        console.error("Error getting classes by course ID:", error);
        return { error: "Failed to get classes" };
      }
    }),

  getClassDetails: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const classDetails = await ctx.db.class.findUnique({
          where: {
            id: input.id,
          },
          include: {
            video: true,
            Folder: true,
            attachments: {
              include: {
                submissions: true,
              },
            },
          },
        });

        return { success: true, data: classDetails };
      } catch (error) {
        console.error("Error getting class details:", error);
        return { error: "Failed to get class details" };
      }
    }),
});
