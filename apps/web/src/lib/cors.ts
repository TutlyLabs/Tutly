const PROD_ORIGIN_PATTERNS: readonly RegExp[] = [
  /^https:\/\/learn\.tutly\.in$/,
  /^https:\/\/localhost$/,
  /^http:\/\/localhost$/,
  /^capacitor:\/\/localhost$/,
  /^tutly:\/\//,
];

const DEV_ORIGIN_PATTERNS: readonly RegExp[] = [
  /^http:\/\/localhost:\d+$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^exp:\/\//,
];

function getActivePatterns(): readonly RegExp[] {
  if (process.env.NODE_ENV === "production") return PROD_ORIGIN_PATTERNS;
  return [...PROD_ORIGIN_PATTERNS, ...DEV_ORIGIN_PATTERNS];
}

export function isTrustedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  return getActivePatterns().some((p) => p.test(origin));
}

// Authorization cannot be wildcarded per CORS spec.
const ALLOWED_REQUEST_HEADERS = [
  "Authorization",
  "Content-Type",
  "x-trpc-source",
  "trpc-accept",
  "x-csrf-token",
  "x-requested-with",
  "Accept",
] as const;

const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";

const EXPOSED_RESPONSE_HEADERS = ["set-auth-token", "set-auth-jwt"] as const;

export function buildCorsHeaders(
  origin: string | null | undefined,
): Record<string, string> {
  if (!isTrustedOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin!,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_REQUEST_HEADERS.join(", "),
    "Access-Control-Expose-Headers": EXPOSED_RESPONSE_HEADERS.join(", "),
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
