import { z } from "zod";

/**
 * Shared input primitives. These exist so a shape is declared once and reused
 * by both the tRPC procedure and the client form that feeds it, rather than
 * being retyped at each call site and drifting.
 */

/**
 * Entity ids are `@default(uuid())` in the schema, but older rows predate that
 * and are not all well-formed uuids, so this stays a non-empty string. Tighten
 * to `z.uuid()` only after auditing the data.
 */
export const idSchema = z.string().min(1, "Required");

export const usernameSchema = z.string().min(1, "Username is required");

export const courseIdSchema = idSchema;
export const classIdSchema = idSchema;
export const assignmentIdSchema = idSchema;
export const submissionIdSchema = idSchema;
export const userIdSchema = idSchema;

/** Matches the bounds already enforced on the paginated procedures. */
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

/**
 * Sandpack's file map, as `sandpackFilesToFilesMap` in the submission router
 * actually consumes it: a path maps either to file contents directly or to an
 * object carrying them under `code`.
 *
 * Sandpack's own metadata (`hidden`, `active`, `readOnly`) is accepted and then
 * stripped — none of it is persisted, and a catchall would give the inferred
 * type an index signature, which Sandpack's `interface` cannot satisfy.
 */
export const sandpackFilesSchema = z.record(
  z.string(),
  z.union([
    z.string(),
    z.object({
      code: z.string().optional(),
    }),
  ]),
);

export type SandpackFiles = z.infer<typeof sandpackFilesSchema>;
