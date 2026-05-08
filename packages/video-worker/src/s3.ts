import { createReadStream, createWriteStream } from "node:fs";
import { stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { env } from "./env.js";

export const s3 = new S3Client({
  region: env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY,
    secretAccessKey: env.AWS_SECRET_KEY,
  },
  ...(env.AWS_ENDPOINT
    ? { endpoint: env.AWS_ENDPOINT, forcePathStyle: true }
    : {}),
});

export async function downloadObject(key: string, destPath: string): Promise<number> {
  const res = await s3.send(
    new GetObjectCommand({ Bucket: env.AWS_BUCKET_NAME, Key: key }),
  );
  if (!res.Body) throw new Error(`Empty body for s3 object ${key}`);
  const body = res.Body as NodeJS.ReadableStream;
  await pipeline(body, createWriteStream(destPath));
  const s = await stat(destPath);
  return s.size;
}

interface UploadOpts {
  contentType: string;
  cacheControl?: string;
}

export async function uploadFile(
  key: string,
  filePath: string,
  opts: UploadOpts,
): Promise<void> {
  const s = await stat(filePath);
  await s3.send(
    new PutObjectCommand({
      Bucket: env.AWS_BUCKET_NAME,
      Key: key,
      Body: createReadStream(filePath),
      ContentType: opts.contentType,
      ContentLength: s.size,
      CacheControl: opts.cacheControl,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  try {
    await s3.send(
      new DeleteObjectCommand({ Bucket: env.AWS_BUCKET_NAME, Key: key }),
    );
  } catch {
    /* ignore */
  }
}

export function publicUrl(key: string): string {
  return `${env.AWS_S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}
