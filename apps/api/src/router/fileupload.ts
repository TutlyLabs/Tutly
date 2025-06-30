import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';

import {
  AWS_ACCESS_KEY,
  AWS_BUCKET_NAME,
  AWS_BUCKET_REGION,
  AWS_ENDPOINT,
  AWS_S3_URL,
  AWS_SECRET_KEY,
} from '../lib/constants';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const allowedMimeTypes = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/webp',
  'image/svg+xml',
  // Videos
  'video/mp4',
  'video/mpeg',
  'video/x-msvideo',
  'video/quicktime',
  'video/x-ms-wmv',
  'video/x-flv',
  'video/webm',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/aac',
  'audio/ogg',
  'audio/midi',
  'audio/x-midi',
  'audio/webm',
  'audio/mp4',
  // Documents
  'text/plain',
  'text/csv',
  'application/rtf',
  'application/msword',
  'application/vnd.oasis.opendocument.text',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.spreadsheet',
];

const s3Client = new S3Client({
  region: AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
  },
  // only for dev (localstack)
  ...(AWS_ENDPOINT && {
    endpoint: AWS_ENDPOINT,
    forcePathStyle: true,
  }),
});

function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]?.toLowerCase()}` : '';
}

export const fileUploadRouter = createTRPCRouter({
  createFileAndGetUploadUrl: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        fileType: z.enum(['AVATAR', 'ATTACHMENT', 'NOTES', 'OTHER']),
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

      const internalName = `${crypto.randomUUID()}_$ {Date.now()}${getExtension(input.name)}`;

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

  getDownloadUrl: protectedProcedure
    .input(
      z.object({
        fileId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.db.file.findUnique({
        where: { id: input.fileId },
      });
      if (!file) throw new Error('File not found');

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

  archiveFile: protectedProcedure
    .input(
      z.object({
        fileId: z.string(),
        reason: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

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

      const file = await ctx.db.file.findUnique({
        where: { id: input.fileId },
      });

      if (!file) throw new Error('File not found');

      const publicUrl = file.isPublic ? `${AWS_S3_URL}/${file.fileType}/${file.internalName}` : null;

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

  deleteFile: protectedProcedure
    .input(
      z.object({
        fileId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.db.file.findUnique({
        where: { id: input.fileId },
      });
      if (!file) throw new Error('File not found');

      // Delete from S3
      const command = new DeleteObjectCommand({
        Bucket: AWS_BUCKET_NAME,
        Key: `${file.fileType}/${file.internalName}`,
      });
      await s3Client.send(command);

      // Delete from database
      await ctx.db.file.delete({
        where: { id: input.fileId },
      });

      return true;
    }),

  updateAssociatingId: protectedProcedure
    .input(
      z.object({
        fileId: z.string(),
        associatingId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.db.file.update({
        where: { id: input.fileId },
        data: { associatingId: input.associatingId },
      });

      return file;
    }),
});
