import { Disk } from "flydrive";
import { S3Driver } from "flydrive/drivers/s3";

import { env } from "./env";

let cached: Disk | null = null;

export function getDisk(): Disk {
  if (cached) return cached;
  cached = new Disk(
    new S3Driver({
      credentials: {
        accessKeyId: env.STORAGE_S3_ACCESS_KEY,
        secretAccessKey: env.STORAGE_S3_SECRET_KEY,
      },
      endpoint: env.STORAGE_S3_ENDPOINT,
      region: env.STORAGE_S3_REGION,
      bucket: env.STORAGE_S3_BUCKET,
      forcePathStyle: env.STORAGE_S3_FORCE_PATH_STYLE,
      visibility: "private",
      supportsACL: false,
    }),
  );
  return cached;
}
