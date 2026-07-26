import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  permissionProcedure,
  protectedProcedure,
} from "../trpc";
import {
  requireFileManageAccess,
  requireFileReadAccess,
} from "../lib/authorization";
import { AWS_BUCKET_NAME, AWS_S3_URL, s3Client } from "../lib/s3";

export const allowedMimeTypes = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/webp",
  "image/svg+xml",
  // Videos
  "video/mp4",
  "video/mpeg",
  "video/x-msvideo",
  "video/quicktime",
  "video/x-ms-wmv",
  "video/x-flv",
  "video/webm",
  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/aac",
  "audio/ogg",
  "audio/midi",
  "audio/x-midi",
  "audio/webm",
  "audio/mp4",
  // Documents
  "text/plain",
  "text/csv",
  "application/rtf",
  "application/msword",
  "application/vnd.oasis.opendocument.text",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.spreadsheet",
];


function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? `.${parts[parts.length - 1]?.toLowerCase()}` : "";
}

export const fileUploadRouter = createTRPCRouter({
  createFileAndGetUploadUrl: permissionProcedure("file", "create")
    .input(
      z.object({
        name: z.string(),
        fileType: z.enum(["AVATAR", "ATTACHMENT", "NOTES", "OTHER"]),
        associatingId: z.string().optional(),
        isPublic: z.boolean().default(false),
        mimeType: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      // todo: add mime type validation
      // if (mimeType && !allowedMimeTypes.includes(mimeType)) {
      //   throw new Error("Invalid MIME type");
      // }

      const internalName = `${crypto.randomUUID()}_${Date.now()}${getExtension(input.name)}`;

      const file = await ctx.db.file.create({
        data: {
          name: input.name,
          internalName,
          fileType: input.fileType,
          associatingId: input.associatingId ?? null,
          isPublic: input.isPublic,
          uploadedById: currentUser.id,
        },
      });

      const command = new PutObjectCommand({
        Bucket: AWS_BUCKET_NAME,
        Key: `${file.fileType}/${file.internalName}`,
        ContentType: input.mimeType,
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600,
      }); // 1 hour

      return { signedUrl, file };
    }),

  getDownloadUrl: permissionProcedure("file", "read")
    .input(
      z.object({
        fileId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const file = await requireFileReadAccess(ctx, input.fileId);

      if (file.isPublic) {
        return file.publicUrl;
      }

      const command = new GetObjectCommand({
        Bucket: AWS_BUCKET_NAME,
        Key: `${file.fileType}/${file.internalName}`,
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600,
      });
      return { signedUrl };
    }),

  // Not gated on `file:archive` (INSTRUCTOR+): owners archive their own Drive
  // files today, and requireFileManageAccess already scopes to owner-or-staff.
  archiveFile: protectedProcedure
    .input(
      z.object({
        fileId: z.string(),
        reason: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      await requireFileManageAccess(ctx, input.fileId);

      const file = await ctx.db.file.update({
        where: { id: input.fileId },
        data: {
          isArchived: true,
          archivedById: currentUser.id,
          archiveReason: input.reason,
          archivedAt: new Date(),
        },
      });

      return file;
    }),

  markFileUploaded: protectedProcedure
    .input(
      z.object({
        fileId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      const file = await requireFileManageAccess(ctx, input.fileId);
      // Only the uploader may finalize: this flips isUploaded and mints the
      // public URL, so staff must not complete someone else's pending upload.
      if (file.uploadedById !== currentUser.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
      }

      const publicUrl = file.isPublic
        ? `${AWS_S3_URL}/${file.fileType}/${file.internalName}`
        : null;

      const updatedFile = await ctx.db.file.update({
        where: { id: input.fileId },
        data: {
          isUploaded: true,
          uploadedById: currentUser.id,
          publicUrl,
        },
      });

      return updatedFile;
    }),

  updateAssociatingId: protectedProcedure
    .input(
      z.object({
        fileId: z.string(),
        associatingId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireFileManageAccess(ctx, input.fileId);

      const file = await ctx.db.file.update({
        where: { id: input.fileId },
        data: { associatingId: input.associatingId },
      });

      return file;
    }),
});
