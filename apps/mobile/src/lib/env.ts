const fromEnv = import.meta.env.VITE_API_URL;

if (!fromEnv) {
  // Fail fast — without an API URL the app cannot reach the backend.
  throw new Error(
    "VITE_API_URL is not set. Define it in apps/mobile/.env.{development,production}.",
  );
}

export const API_BASE_URL: string = String(fromEnv).replace(/\/$/, "");
export const IS_DEV = import.meta.env.MODE !== "production";
