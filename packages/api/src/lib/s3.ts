import { S3Client } from "@aws-sdk/client-s3";

export const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME ?? "tutly-local";
export const AWS_BUCKET_REGION = process.env.AWS_BUCKET_REGION ?? "us-east-1";
export const AWS_S3_URL =
  process.env.AWS_S3_URL ?? "http://localhost:9000/tutly-local";

const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY ?? "tutlydev";
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY ?? "tutlydev123";
const AWS_ENDPOINT = process.env.AWS_ENDPOINT;

const getEndpointHostname = (endpoint?: string): string | undefined => {
  if (!endpoint) return undefined;
  try {
    return new URL(endpoint).hostname.toLowerCase();
  } catch {
    return undefined;
  }
};

const endpointHostname = getEndpointHostname(AWS_ENDPOINT);

/** R2 and local MinIO reject this header. */
export const supportsServerSideEncryption =
  endpointHostname === undefined
    ? AWS_ENDPOINT === undefined
    : endpointHostname !== "r2.cloudflarestorage.com" &&
      endpointHostname !== "localhost" &&
      endpointHostname !== "127.0.0.1";

export const s3Client = new S3Client({
  region: AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
  },
  ...(AWS_ENDPOINT
    ? {
        endpoint: AWS_ENDPOINT,
        forcePathStyle: true,
      }
    : {}),
});
