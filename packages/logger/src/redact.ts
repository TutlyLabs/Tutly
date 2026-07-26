/**
 * Keys whose values must never reach a log sink.
 *
 * pino wildcards do not recurse, so every key is expanded to a fixed set of
 * depths (top level, `*.key`, `*.*.key`) in {@link REDACT_PATHS}.
 */
export const SENSITIVE_KEYS: readonly string[] = [
  // Credentials
  "password",
  "oneTimePassword",
  "newPassword",
  "currentPassword",
  "passwordHash",
  "hash",
  // Tokens and keys
  "token",
  "accessToken",
  "refreshToken",
  "sessionToken",
  "idToken",
  "apiKey",
  "api_key",
  "secret",
  "clientSecret",
  "privateKey",
  // Auth transport
  "authorization",
  "cookie",
  "set-cookie",
  // PII
  "email",
  "phone",
  "phoneNumber",
];

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

const segment = (key: string): string => (IDENTIFIER.test(key) ? `.${key}` : `["${key}"]`);

const path = (prefix: string, key: string): string =>
  prefix === "" ? segment(key).replace(/^\./, "") : `${prefix}${segment(key)}`;

const expand = (keys: readonly string[]): string[] =>
  ["", "*", "*.*"].flatMap((prefix) => keys.map((key) => path(prefix, key)));

/**
 * Explicit request/response shapes that sit deeper than the generic expansion.
 */
const TRANSPORT_PATHS: readonly string[] = [
  "req.headers.authorization",
  "req.headers.cookie",
  'req.headers["set-cookie"]',
  "res.headers.authorization",
  'res.headers["set-cookie"]',
  "request.headers.authorization",
  "request.headers.cookie",
  "response.headers.authorization",
  'response.headers["set-cookie"]',
  "headers.authorization",
  "headers.cookie",
  'headers["set-cookie"]',
];

export const REDACT_PATHS: readonly string[] = [
  ...new Set([...expand(SENSITIVE_KEYS), ...TRANSPORT_PATHS]),
];

export const REDACT_CENSOR = "[REDACTED]";
