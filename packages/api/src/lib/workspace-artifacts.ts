import {
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHash, randomUUID } from "node:crypto";

import type { AssignmentArtifactKind } from "@tutly/db/browser";

import { AWS_BUCKET_NAME, s3Client, supportsServerSideEncryption } from "./s3";

export const workspaceArtifactBucket = AWS_BUCKET_NAME;


export function getFileExtension(fileName?: string | null): string {
  if (!fileName) return ".zip";
  const lastSegment = fileName.split("/").pop() ?? fileName;
  const dotIndex = lastSegment.lastIndexOf(".");
  if (dotIndex < 0) return ".zip";
  return lastSegment.slice(dotIndex).toLowerCase().replace(/[^a-z0-9.]/g, "");
}

export function buildWorkspaceObjectKey(input: {
  assignmentId?: string | null;
  submissionId?: string | null;
  kind: AssignmentArtifactKind;
  fileName?: string | null;
}): string {
  const assignmentPart = input.assignmentId ?? "unassigned";
  const submissionPart = input.submissionId ?? "template";
  const extension = getFileExtension(input.fileName);
  return [
    "assignments",
    assignmentPart,
    submissionPart,
    input.kind.toLowerCase(),
    `${Date.now()}-${randomUUID()}${extension}`,
  ].join("/");
}

export function sha256Hex(buffer: Buffer | Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function getArtifactUploadUrl(input: {
  objectKey: string;
  mimeType?: string | null;
  checksum?: string | null;
  expiresIn?: number;
}) {
  const command = new PutObjectCommand({
    Bucket: AWS_BUCKET_NAME,
    Key: input.objectKey,
    ContentType: input.mimeType ?? "application/zip",
    Metadata: input.checksum ? { checksum: input.checksum } : undefined,
    ...(supportsServerSideEncryption
      ? { ServerSideEncryption: "AES256" as const }
      : {}),
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: input.expiresIn ?? 3600,
  });
}

export async function getArtifactDownloadUrl(input: {
  objectKey: string;
  expiresIn?: number;
}) {
  const command = new GetObjectCommand({
    Bucket: AWS_BUCKET_NAME,
    Key: input.objectKey,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: input.expiresIn ?? 3600,
  });
}

