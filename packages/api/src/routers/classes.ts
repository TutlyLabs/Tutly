import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  requireClassManageAccess,
  requireClassReadAccess,
  requireCourseManageAccess,
  requireCourseReadAccess,
} from "../lib/authorization";
import {
  createTRPCRouter,
  permissionProcedure,
  staffProcedure,
} from "../trpc";

export const classesRouter = createTRPCRouter({
  getLatestForCourse: permissionProcedure("class", "read")
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireCourseReadAccess(ctx, input.courseId);

      const cls = await ctx.db.class.findFirst({
        where: { courseId: input.courseId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      return cls;
    }),

  createClass: permissionProcedure("class", "create")
    .input(
      z.object({
        classTitle: z.string().trim().min(1, {
          message: "Title is required",
        }),
        videoLink: z.string().nullable(),
        videoType: z.enum(["DRIVE", "YOUTUBE", "ZOOM", "HLS"]),
        videoId: z.string().optional(),
        courseId: z.string().trim().min(1),
        createdAt: z.string().optional(),
        folderId: z.string().optional(),
        folderName: z.string().optional(),
        // Live class fields
        classType: z.enum(["RECORDED", "LIVE"]).optional().default("RECORDED"),
        liveProvider: z.enum(["ZOOM", "GOOGLE_MEET"]).optional().nullable(),
        startTime: z.string().optional().nullable(),
        endTime: z.string().optional().nullable(),
        meetingUrl: z.string().optional().nullable(),
        meetingId: z.string().optional().nullable(),
        meetingPasscode: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Outside the try: the catch below flattens every error into a generic
      // message, which would turn an authorization failure into a 500.
      await requireCourseManageAccess(ctx, input.courseId);

      try {
        if (input.videoType === "HLS" && !input.videoId) {
          throw new Error("HLS class requires a pre-created videoId");
        }

        const classData = {
          title: input.classTitle,
          createdAt: input.createdAt ? new Date(input.createdAt) : new Date(),
          video:
            input.videoId
              ? { connect: { id: input.videoId } }
              : {
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
          // Live class fields
          classType: input.classType,
          liveProvider: input.liveProvider ?? null,
          startTime: input.startTime ? new Date(input.startTime) : null,
          endTime: input.endTime ? new Date(input.endTime) : null,
          meetingUrl: input.meetingUrl ?? null,
          meetingId: input.meetingId ?? null,
          meetingPasscode: input.meetingPasscode ?? null,
        };

        let createdClass;
        if (input.folderId) {
          createdClass = await ctx.db.class.create({
            data: {
              ...classData,
              Folder: { connect: { id: input.folderId } },
            },
          });
        } else if (input.folderName) {
          createdClass = await ctx.db.class.create({
            data: {
              ...classData,
              Folder: {
                create: {
                  title: input.folderName,
                  createdAt: input.createdAt ? new Date(input.createdAt) : new Date(),
                },
              },
            },
          });
        } else {
          createdClass = await ctx.db.class.create({ data: classData });
        }

        // Post activity to course chat group (fire-and-forget)
        const group = await ctx.db.chatGroup.findFirst({
          where: { courseId: input.courseId, type: "COURSE" },
        });
        if (group) {
          await ctx.db.message.create({
            data: {
              groupId: group.id,
              senderId: ctx.session.user.id,
              content: `📚 New class added: ${input.classTitle}`,
              type: "ACTIVITY",
              metadata: { event: "CLASS_CREATED", classId: createdClass.id, courseId: input.courseId },
            },
          });
        }

        return createdClass;
      } catch (error) {
        console.error("Error creating class:", error);
        throw new Error("Error creating class");
      }
    }),

  updateClass: permissionProcedure("class", "update")
    .input(
      z.object({
        classId: z.string(),
        courseId: z.string(),
        classTitle: z.string(),
        videoLink: z.string().nullable(),
        videoType: z.enum(["DRIVE", "YOUTUBE", "ZOOM", "HLS"]),
        videoId: z.string().optional(),
        folderId: z.string().optional(),
        folderName: z.string().optional(),
        createdAt: z.string().optional(),
        // Live class fields
        classType: z.enum(["RECORDED", "LIVE"]).optional().default("RECORDED"),
        liveProvider: z.enum(["ZOOM", "GOOGLE_MEET"]).optional().nullable(),
        startTime: z.string().optional().nullable(),
        endTime: z.string().optional().nullable(),
        meetingUrl: z.string().optional().nullable(),
        meetingId: z.string().optional().nullable(),
        meetingPasscode: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cls = await requireClassManageAccess(ctx, input.classId);
      if (cls.courseId !== input.courseId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
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

        const switchingToHls =
          input.videoType === "HLS" && existingClass.video.videoType !== "HLS";
        if (switchingToHls && !input.videoId) {
          throw new Error(
            "Switching to HLS requires uploading a new video first.",
          );
        }

        // Update video — for HLS, the upload flow already created the new Video row
        // and we re-point Class.videoId to it. For other types, mutate existing Video in place.
        if (input.videoType === "HLS" && input.videoId && input.videoId !== existingClass.video.id) {
          await ctx.db.class.update({
            where: { id: input.classId },
            data: { video: { connect: { id: input.videoId } } },
          });
        } else if (input.videoType !== "HLS") {
          await ctx.db.video.update({
            where: { id: existingClass.video.id },
            data: {
              videoLink: input.videoLink ?? null,
              videoType: input.videoType,
            },
          });
        }

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
            // Live class fields
            classType: input.classType,
            liveProvider: input.liveProvider ?? null,
            startTime: input.startTime ? new Date(input.startTime) : null,
            endTime: input.endTime ? new Date(input.endTime) : null,
            meetingUrl: input.meetingUrl ?? null,
            meetingId: input.meetingId ?? null,
            meetingPasscode: input.meetingPasscode ?? null,
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

  getClassDeletionInfo: permissionProcedure("class", "delete")
    .input(
      z.object({
        classId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireClassManageAccess(ctx, input.classId);

      try {
        const classInfo = await ctx.db.class.findUnique({
          where: { id: input.classId },
          include: {
            _count: {
              select: {
                attachments: true,
                Attendence: true,
              },
            },
            attachments: {
              include: {
                _count: {
                  select: {
                    submissions: {
                      where: {
                        status: "SUBMITTED",
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!classInfo) {
          throw new Error("Class not found");
        }

        // Count notes for this class
        const notesCount = await ctx.db.notes.count({
          where: {
            objectId: input.classId,
            category: "CLASS",
          },
        });

        // Calculate total submissions across all attachments
        const totalSubmissions = classInfo.attachments.reduce(
          (sum: number, attachment: any) => sum + attachment._count.submissions,
          0,
        );

        return {
          success: true,
          data: {
            attachmentsCount: classInfo._count.attachments,
            attendanceCount: classInfo._count.Attendence,
            notesCount,
            totalSubmissions,
          },
        };
      } catch (error) {
        console.error("Error getting class deletion info:", error);
        throw new Error("Failed to get class deletion info");
      }
    }),

  deleteClass: permissionProcedure("class", "delete")
    .input(
      z.object({
        classId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireClassManageAccess(ctx, input.classId);

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

  // Counts every class in the deployment, across all organizations, so it is
  // staff-only rather than a plain class:list read.
  totalNumberOfClasses: staffProcedure.query(async ({ ctx }) => {
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

  getClassesByCourseId: permissionProcedure("class", "list")
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireCourseReadAccess(ctx, input.courseId);

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

  getClassDetails: permissionProcedure("class", "read")
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireClassReadAccess(ctx, input.id);

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
                submissions: {
                  where: {
                    status: "SUBMITTED",
                  },
                },
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
