import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  requireClassManageAccess,
  requireClassReadAccess,
  requireCourseManageAccess,
  requireCourseReadAccess,
} from "../../lib/authorization";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import {
  classTypeSchema,
  dryRunSchema,
  isoDateSchema,
  liveProviderSchema,
  requireGrant,
  titleSchema,
  videoTypeSchema,
} from "./shared";

/**
 * `Class.videoId` is non-nullable, so every class owns a Video row even when
 * there is nothing to play — a live class before its recording exists, for
 * instance. This mirrors what `classes.createClass` does.
 */
const videoSchema = z
  .object({
    type: videoTypeSchema.default("YOUTUBE"),
    link: z.string().trim().url().nullable().optional(),
    /**
     * Pre-created Video id. Required for HLS, whose row is created by the
     * upload pipeline before the class exists.
     */
    videoId: z.string().optional(),
  })
  .optional();

const liveSchema = z
  .object({
    provider: liveProviderSchema.optional(),
    startTime: isoDateSchema.optional(),
    endTime: isoDateSchema.optional(),
    meetingUrl: z.string().trim().url().optional(),
    meetingId: z.string().trim().optional(),
    meetingPasscode: z.string().trim().optional(),
  })
  .optional();

export const agentClassesRouter = createTRPCRouter({
  /** Compact class list — titles, ids, dates. Enough to pick one by name. */
  list: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireCourseReadAccess(ctx, input.courseId);

      const classes = await ctx.db.class.findMany({
        where: { courseId: input.courseId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          classType: true,
          startTime: true,
          createdAt: true,
          Folder: { select: { id: true, title: true } },
          _count: { select: { attachments: true, Attendence: true } },
        },
      });

      return classes.map((cls) => ({
        id: cls.id,
        title: cls.title,
        classType: cls.classType,
        startTime: cls.startTime,
        createdAt: cls.createdAt,
        folder: cls.Folder,
        assignmentCount: cls._count.attachments,
        attendanceCount: cls._count.Attendence,
      }));
    }),

  get: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireClassReadAccess(ctx, input.classId);

      const cls = await ctx.db.class.findUnique({
        where: { id: input.classId },
        include: {
          video: {
            select: {
              id: true,
              videoType: true,
              videoLink: true,
              status: true,
            },
          },
          Folder: { select: { id: true, title: true } },
          attachments: {
            select: {
              id: true,
              title: true,
              attachmentType: true,
              submissionMode: true,
              dueDate: true,
            },
          },
          _count: { select: { Attendence: true } },
        },
      });

      if (!cls) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      return {
        id: cls.id,
        title: cls.title,
        courseId: cls.courseId,
        classType: cls.classType,
        liveProvider: cls.liveProvider,
        startTime: cls.startTime,
        endTime: cls.endTime,
        meetingUrl: cls.meetingUrl,
        createdAt: cls.createdAt,
        video: cls.video,
        folder: cls.Folder,
        assignments: cls.attachments,
        attendanceCount: cls._count.Attendence,
      };
    }),

  /**
   * Create or update a class in one call.
   *
   * Passing `classId` updates; omitting it creates. Folder is addressed by name
   * (`folderName`) or id, and a name that does not exist yet is created — a
   * caller working from "put this in the Week 3 folder" has no id to give.
   */
  upsert: protectedProcedure
    .input(
      z.object({
        classId: z.string().optional(),
        courseId: z.string(),
        title: titleSchema,
        video: videoSchema,
        folderId: z.string().optional(),
        folderName: z.string().trim().min(1).optional(),
        classType: classTypeSchema.default("RECORDED"),
        live: liveSchema,
        /** Backdating an imported class; defaults to now on create. */
        createdAt: isoDateSchema.optional(),
        dryRun: dryRunSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isUpdate = Boolean(input.classId);

      requireGrant(ctx.session, "class", isUpdate ? "update" : "create");

      if (input.classId) {
        const existing = await requireClassManageAccess(ctx, input.classId);
        if (existing.courseId !== input.courseId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Class does not belong to the given course",
          });
        }
      } else {
        await requireCourseManageAccess(ctx, input.courseId);
      }

      if (input.folderId && input.folderName) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pass folderId or folderName, not both",
        });
      }

      const videoType = input.video?.type ?? "YOUTUBE";
      if (videoType === "HLS" && !input.video?.videoId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "HLS classes need a videoId from the upload pipeline; upload the video first.",
        });
      }

      if (input.classType === "LIVE" && !input.live?.provider) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Live classes need live.provider",
        });
      }

      if (
        input.live?.startTime &&
        input.live.endTime &&
        input.live.endTime <= input.live.startTime
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "live.endTime must be after live.startTime",
        });
      }

      if (input.dryRun) {
        return {
          dryRun: true as const,
          action: isUpdate ? ("update" as const) : ("create" as const),
          classId: input.classId ?? null,
          courseId: input.courseId,
          title: input.title,
          classType: input.classType,
          videoType,
          folder: input.folderName
            ? { create: input.folderName }
            : input.folderId
              ? { connect: input.folderId }
              : null,
        };
      }

      const liveFields = {
        classType: input.classType,
        liveProvider: input.live?.provider ?? null,
        startTime: input.live?.startTime ?? null,
        endTime: input.live?.endTime ?? null,
        meetingUrl: input.live?.meetingUrl ?? null,
        meetingId: input.live?.meetingId ?? null,
        meetingPasscode: input.live?.meetingPasscode ?? null,
      };

      // One transaction so a class never lands without its video or folder.
      const result = await ctx.db.$transaction(async (tx) => {
        let folderId = input.folderId ?? null;
        if (input.folderName) {
          const folder = await tx.folder.create({
            data: {
              title: input.folderName,
              createdAt: input.createdAt ?? new Date(),
            },
          });
          folderId = folder.id;
        }

        if (!input.classId) {
          return tx.class.create({
            // Relation form throughout: Prisma rejects a payload that mixes
            // scalar foreign keys with a nested relation op like `video.create`.
            data: {
              title: input.title,
              createdAt: input.createdAt ?? new Date(),
              course: { connect: { id: input.courseId } },
              ...(folderId ? { Folder: { connect: { id: folderId } } } : {}),
              ...liveFields,
              video: input.video?.videoId
                ? { connect: { id: input.video.videoId } }
                : {
                    create: {
                      videoLink: input.video?.link ?? null,
                      videoType,
                    },
                  },
            },
            include: { video: true, Folder: true },
          });
        }

        const existing = await tx.class.findUniqueOrThrow({
          where: { id: input.classId },
          include: { video: true },
        });

        // HLS re-points the class at the new Video row the pipeline created;
        // every other type mutates the existing row in place.
        if (
          videoType === "HLS" &&
          input.video?.videoId &&
          input.video.videoId !== existing.videoId
        ) {
          await tx.class.update({
            where: { id: input.classId },
            data: { video: { connect: { id: input.video.videoId } } },
          });
        } else if (input.video && videoType !== "HLS") {
          await tx.video.update({
            where: { id: existing.videoId },
            data: { videoLink: input.video.link ?? null, videoType },
          });
        }

        return tx.class.update({
          where: { id: input.classId },
          data: {
            title: input.title,
            ...(input.createdAt ? { createdAt: input.createdAt } : {}),
            // Only touch the folder when the caller said something about it;
            // otherwise an update would silently orphan the class.
            ...(input.folderName || input.folderId ? { folderId } : {}),
            ...liveFields,
          },
          include: { video: true, Folder: true },
        });
      });

      return {
        dryRun: false as const,
        action: isUpdate ? ("update" as const) : ("create" as const),
        class: {
          id: result.id,
          title: result.title,
          courseId: result.courseId,
          classType: result.classType,
          startTime: result.startTime,
          folder: result.Folder,
          video: { id: result.video.id, videoType: result.video.videoType },
        },
      };
    }),

  /**
   * Delete a class. Defaults to a dry run reporting what goes with it —
   * attendance and attachments cascade, and submissions hang off attachments.
   */
  delete: protectedProcedure
    .input(z.object({ classId: z.string(), dryRun: dryRunSchema }))
    .mutation(async ({ ctx, input }) => {
      requireGrant(ctx.session, "class", "delete");
      await requireClassManageAccess(ctx, input.classId);

      const cls = await ctx.db.class.findUnique({
        where: { id: input.classId },
        include: {
          _count: { select: { attachments: true, Attendence: true } },
          attachments: {
            select: {
              _count: {
                select: { submissions: { where: { status: "SUBMITTED" } } },
              },
            },
          },
        },
      });

      if (!cls) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      const submittedCount = cls.attachments.reduce(
        (total, attachment) => total + attachment._count.submissions,
        0,
      );

      const impact = {
        classId: cls.id,
        title: cls.title,
        attachments: cls._count.attachments,
        attendanceRecords: cls._count.Attendence,
        submittedSubmissions: submittedCount,
      };

      if (input.dryRun) return { dryRun: true as const, impact };

      await ctx.db.class.delete({ where: { id: input.classId } });
      return { dryRun: false as const, deleted: true as const, impact };
    }),
});
