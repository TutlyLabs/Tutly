import { z } from "zod";

const schema = z.object({
  STORAGE_S3_ENDPOINT: z.string().url(),
  STORAGE_S3_REGION: z.string().default("us-east-1"),
  STORAGE_S3_BUCKET: z.string().min(1),
  STORAGE_S3_ACCESS_KEY: z.string().min(1),
  STORAGE_S3_SECRET_KEY: z.string().min(1),
  STORAGE_S3_FORCE_PATH_STYLE: z
    .string()
    .default("false")
    .transform((s) => s === "true" || s === "1"),
});

export const env = schema.parse(process.env);
