export const AUTH_COOKIE_NAME = "app_auth_token";

// Environment variables
export const NODE_ENV = process.env.NODE_ENV || "development";
export const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/tutly_local";

// AWS Configuration
export const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || "tutly-local";
export const AWS_BUCKET_REGION = process.env.AWS_BUCKET_REGION || "us-east-1";
export const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY || "test";
export const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY || "test";
export const AWS_ENDPOINT = process.env.AWS_ENDPOINT || "http://localhost:4566";
export const AWS_S3_URL =
  process.env.AWS_S3_URL || "http://localhost:4566/tutly-local";

// Email Service
export const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_123456";

// Vapid keys for push notifications
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:dev@tutly.in";
export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  "bm1K6-J0Jvao8lo_M32di0m0e-hQxg4OlR7usWIVG9Q";
export const NEXT_PUBLIC_VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BBdmd8iX5h_y1dwMs-UHTyPBL3CWbfDG7Jf_JMnTuv7Q7l86WdUjYkeMGUlvIEpm3xN_-dcuLWvEcoJ0ULXRWSA";

// Port for local development
export const PORT = process.env.PORT || 3000;

// Vercel URL for production deployments
export const VERCEL_URL = process.env.VERCEL_URL;

export const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";
