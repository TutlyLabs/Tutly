import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { AWS_BUCKET_NAME, AWS_S3_URL, s3Client } from "../lib/s3";

const VIDEO_WORKER_URL = process.env.VIDEO_WORKER_URL;
const VIDEO_WORKER_SECRET = process.env.VIDEO_WORKER_SECRET;

const ALLOWED_VIDEO_MIME = new Set([
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/webm",
]);

const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024;

function extOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

async function enqueueWorker(videoId: string, rawObjectKey: string) {
  if (!VIDEO_WORKER_URL || !VIDEO_WORKER_SECRET) {
    console.warn(
      "[videos] VIDEO_WORKER_URL or VIDEO_WORKER_SECRET not set — skipping enqueue (video will stay PROCESSING).",
    );
    return;
  }
  const res = await fetch(`${VIDEO_WORKER_URL}/enqueue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Worker-Secret": VIDEO_WORKER_SECRET,
    },
    body: JSON.stringify({ videoId, rawObjectKey }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Worker enqueue failed (${res.status}): ${text}`);
  }
}

export const videosRouter = createTRPCRouter({
  requestUpload: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(256),
        fileSize: z.number().int().positive().max(MAX_VIDEO_BYTES),
        mimeType: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ALLOWED_VIDEO_MIME.has(input.mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unsupported video MIME type: ${input.mimeType}`,
        });
      }

      const user = ctx.session.user;
      if (user.role !== "INSTRUCTOR" && user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only instructors can upload class videos",
        });
      }

      const video = await ctx.db.video.create({
        data: {
          videoType: "HLS",
          status: "UPLOADING",
          uploadedById: user.id,
        },
      });

      const rawObjectKey = `videos/raw/${video.id}${extOf(input.fileName)}`;

      const command = new PutObjectCommand({
        Bucket: AWS_BUCKET_NAME,
        Key: rawObjectKey,
        ContentType: input.mimeType,
      });

      const uploadUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600,
      });

      await ctx.db.video.update({
        where: { id: video.id },
        data: { rawObjectKey },
      });

      return {
        videoId: video.id,
        uploadUrl,
        rawObjectKey,
      };
    }),

  uploadComplete: protectedProcedure
    .input(z.object({ videoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const video = await ctx.db.video.findUnique({
        where: { id: input.videoId },
      });
      if (!video) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      }
      if (video.uploadedById && video.uploadedById !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (!video.rawObjectKey) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Video has no raw upload key",
        });
      }

      await ctx.db.video.update({
        where: { id: input.videoId },
        data: { status: "PROCESSING", errorMessage: null },
      });

      try {
        await enqueueWorker(input.videoId, video.rawObjectKey);
      } catch (e) {
        await ctx.db.video.update({
          where: { id: input.videoId },
          data: {
            status: "FAILED",
            errorMessage:
              e instanceof Error ? e.message : "Failed to enqueue worker",
          },
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to enqueue video processing",
        });
      }

      return { success: true };
    }),

  getStatus: protectedProcedure
    .input(z.object({ videoId: z.string() }))
    .query(async ({ ctx, input }) => {
      const video = await ctx.db.video.findUnique({
        where: { id: input.videoId },
        select: {
          id: true,
          status: true,
          videoType: true,
          hlsPlaylistUrl: true,
          thumbnailUrl: true,
          duration: true,
          errorMessage: true,
          progress: true,
          progressStep: true,
          processStartedAt: true,
          processEndedAt: true,
        },
      });
      if (!video) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return video;
    }),

  retry: protectedProcedure
    .input(z.object({ videoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      if (user.role !== "INSTRUCTOR" && user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const video = await ctx.db.video.findUnique({
        where: { id: input.videoId },
      });
      if (!video) throw new TRPCError({ code: "NOT_FOUND" });
      if (!video.rawObjectKey) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No raw upload to retry",
        });
      }
      if (video.status === "UPLOADING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Upload still in progress — wait for it to complete",
        });
      }

      await ctx.db.video.update({
        where: { id: input.videoId },
        data: { status: "PROCESSING", errorMessage: null },
      });

      try {
        await enqueueWorker(input.videoId, video.rawObjectKey);
      } catch (e) {
        await ctx.db.video.update({
          where: { id: input.videoId },
          data: {
            status: "FAILED",
            errorMessage:
              e instanceof Error ? e.message : "Failed to enqueue worker",
          },
        });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      return { success: true };
    }),

  listRuns: protectedProcedure
    .input(
      z
        .object({
          status: z
            .enum(["all", "UPLOADING", "PROCESSING", "READY", "FAILED"])
            .default("all"),
          limit: z.number().int().min(1).max(100).default(50),
        })
        .optional()
        .default({ status: "all", limit: 50 }),
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;
      if (user.role === "STUDENT") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const isAdmin = user.role === "INSTRUCTOR" || user.role === "ADMIN";
      const adminCourseIds: string[] = isAdmin
        ? []
        : (user.adminForCourses ?? []).map((c: { id: string }) => c.id);

      const where = {
        videoType: "HLS" as const,
        ...(input.status !== "all" ? { status: input.status } : {}),
        ...(isAdmin
          ? {}
          : adminCourseIds.length
            ? { class: { some: { courseId: { in: adminCourseIds } } } }
            : { id: "__none__" }), // mentors with no admin-courses see nothing
      };

      const videos = await ctx.db.video.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        take: input.limit,
        select: {
          id: true,
          status: true,
          progress: true,
          progressStep: true,
          duration: true,
          errorMessage: true,
          processStartedAt: true,
          processEndedAt: true,
          createdAt: true,
          updatedAt: true,
          hlsPlaylistUrl: true,
          thumbnailUrl: true,
          class: {
            select: {
              id: true,
              title: true,
              courseId: true,
              course: { select: { title: true } },
            },
          },
        },
      });

      const counts = await ctx.db.video.groupBy({
        by: ["status"],
        where: {
          videoType: "HLS",
          ...(isAdmin
            ? {}
            : adminCourseIds.length
              ? { class: { some: { courseId: { in: adminCourseIds } } } }
              : { id: "__none__" }),
        },
        _count: { _all: true },
      });

      const countMap: Record<string, number> = {
        UPLOADING: 0,
        PROCESSING: 0,
        READY: 0,
        FAILED: 0,
      };
      for (const c of counts) countMap[c.status] = c._count._all;

      return { runs: videos, counts: countMap };
    }),

  abandon: protectedProcedure
    .input(z.object({ videoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Used when user cancels upload before linking to a class.
      const video = await ctx.db.video.findUnique({
        where: { id: input.videoId },
        include: { class: { select: { id: true } } },
      });
      if (!video) return { success: true };
      if (video.uploadedById && video.uploadedById !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (video.class.length > 0) {
        return { success: false as const, reason: "linked-to-class" };
      }

      if (video.rawObjectKey) {
        try {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: AWS_BUCKET_NAME,
              Key: video.rawObjectKey,
            }),
          );
        } catch (e) {
          console.warn("[videos.abandon] failed to delete raw object", e);
        }
      }

      await ctx.db.video.delete({ where: { id: input.videoId } });
      return { success: true as const };
    }),
});

export const _videoExports = { AWS_S3_URL };
