import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type {
  ActionsOf,
  PermissionRequest,
  Resource,
} from "@tutly/auth/permissions";
import { hasPermission } from "@tutly/auth/access-control";

import type { AuthedSessionContext } from "../../trpc";

/**
 * Branch-aware grant check.
 *
 * `permissionProcedure` gates a whole procedure on one resource/action pair,
 * which an upsert cannot use: it needs `create` on one path and `update` on the
 * other, and gating on both would deny callers who legitimately hold only one.
 */
export function requireGrant<R extends Resource>(
  session: AuthedSessionContext,
  resource: R,
  action: ActionsOf<R>,
): void {
  const request = { [resource]: [action] } as PermissionRequest;
  if (!hasPermission(session.user.role, request)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Missing permission: ${resource}:${String(action)}`,
    });
  }
}

/**
 * Every write tool takes this. Agents retry and mis-resolve ids, so the default
 * is to report what *would* change and commit only when asked.
 */
export const dryRunSchema = z
  .boolean()
  .default(false)
  .describe(
    "Preview the change and return the planned effect without writing.",
  );

/** Trimmed, non-empty string — agents routinely pass padded values. */
export const titleSchema = z.string().trim().min(1).max(300);

export const videoTypeSchema = z.enum(["DRIVE", "YOUTUBE", "ZOOM", "HLS"]);
export const classTypeSchema = z.enum(["RECORDED", "LIVE"]);
export const liveProviderSchema = z.enum(["ZOOM", "GOOGLE_MEET"]);

export const submissionModeSchema = z.enum([
  "HTML_CSS_JS",
  "REACT",
  "EXTERNAL_LINK",
  "SANDBOX",
  "WORKSPACE",
  "GIT",
]);

/**
 * An ISO date or date-time. Accepts a bare `YYYY-MM-DD` because that is what a
 * model produces when a human says "due Friday"; `z.coerce.date` alone would
 * also accept nonsense like `"tomorrow"` as an Invalid Date.
 */
export const isoDateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Expected an ISO 8601 date or date-time",
  })
  .transform((value) => new Date(value));

export const testCaseSchema = z.object({
  title: titleSchema,
  /** Shell command whose exit code decides the outcome. */
  command: z.string().trim().min(1),
  visibility: z
    .enum(["VISIBLE", "HIDDEN"])
    .default("VISIBLE")
    .describe(
      "HIDDEN cases run only on the trusted runner, never client-side.",
    ),
  points: z.number().int().min(0).default(1),
  timeoutMs: z.number().int().min(1000).max(600_000).default(120_000),
});

export type TestCaseInput = z.infer<typeof testCaseSchema>;

export const workspaceConfigSchema = z.object({
  framework: z.string().trim().min(1).optional(),
  setupCommand: z.string().trim().nullable().optional(),
  devCommand: z.string().trim().nullable().optional(),
  testCommand: z.string().trim().nullable().optional(),
  previewPorts: z.array(z.number().int().min(1).max(65535)).optional(),
  readonlyPaths: z.array(z.string().trim().min(1)).optional(),
});

/**
 * Rejects duplicate test-case titles.
 *
 * Titles are how a reported result is matched back to its case, and how a
 * student reads a failure. Two cases sharing one makes both unattributable.
 */
export function assertUniqueTestCaseTitles(testCases: TestCaseInput[]): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const testCase of testCases) {
    const key = testCase.title.toLowerCase();
    if (seen.has(key)) duplicates.add(testCase.title);
    seen.add(key);
  }
  if (duplicates.size > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Duplicate test case titles: ${[...duplicates].join(", ")}`,
    });
  }
}
