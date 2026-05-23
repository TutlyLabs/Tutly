#!/usr/bin/env tsx

// DB inline → @tutly/storage migration. Idempotent.
//
// Usage:
//   pnpm tsx --env-file=apps/web/.env apps/web/scripts/migrate-to-storage.ts --dry-run
//   pnpm tsx --env-file=apps/web/.env apps/web/scripts/migrate-to-storage.ts --backfill
//   pnpm tsx --env-file=apps/web/.env apps/web/scripts/migrate-to-storage.ts --backfill --limit-per-assignment=10
//
// Keys: org/{orgId}/courses/{courseId}/assignments/{aid}/template|hidden-tests|submissions/{id}/

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@tutly/db/client";
import {
  env,
  hasSubmission,
  hasTemplate,
  writeSandpackTemplate,
  writeSubmission,
  type Locator,
  type SandpackTemplateShape,
} from "@tutly/storage";

import {
  filterSubmissionInput,
  type SandpackTemplate,
} from "../../../packages/api/src/lib/template-policy";

type Mode = "dry-run" | "backfill";

type Args = {
  mode: Mode;
  batchSize: number;
  concurrency: number;
  databaseUrl?: string;
  limitPerAssignment?: number;
};

function parseArgs(argv: string[]): Args {
  const out: Args = { mode: "backfill", batchSize: 100, concurrency: 4 };
  for (const raw of argv) {
    if (raw === "--dry-run") out.mode = "dry-run";
    else if (raw === "--backfill") out.mode = "backfill";
    else if (raw.startsWith("--batch-size=")) {
      out.batchSize = clamp(Number(raw.slice("--batch-size=".length)), 1, 500);
    } else if (raw.startsWith("--concurrency=")) {
      out.concurrency = clamp(
        Number(raw.slice("--concurrency=".length)),
        1,
        32,
      );
    } else if (raw.startsWith("--database-url=")) {
      out.databaseUrl = raw.slice("--database-url=".length);
    } else if (raw.startsWith("--limit-per-assignment=")) {
      out.limitPerAssignment = clamp(
        Number(raw.slice("--limit-per-assignment=".length)),
        1,
        10_000,
      );
    }
  }
  return out;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

const args = parseArgs(process.argv.slice(2));
const databaseUrl = args.databaseUrl ?? process.env.DATABASE_URL ?? "";
if (!databaseUrl) {
  throw new Error("DATABASE_URL not set. Pass --database-url=... or set env.");
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

type Stats = {
  scanned: number;
  migrated: number;
  skipped: number;
  errors: number;
};
const newStats = (): Stats => ({
  scanned: 0,
  migrated: 0,
  skipped: 0,
  errors: 0,
});

function toFilesMap(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
    else if (v && typeof v === "object" && "code" in v) {
      const c = (v as { code?: unknown }).code;
      out[k] = typeof c === "string" ? c : "";
    }
  }
  return out;
}

function decodeBase64Json(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

function buildLocator(row: {
  id: string;
  courseId: string | null;
  course: { createdBy: { organizationId: string | null } } | null;
}): Locator {
  return {
    orgId: row.course?.createdBy?.organizationId ?? null,
    courseId: row.courseId,
    assignmentId: row.id,
  };
}

async function pmap<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = items.slice();
  const workers = Array.from(
    { length: Math.min(limit, queue.length) },
    async () => {
      for (;;) {
        const next = queue.shift();
        if (!next) return;
        await fn(next);
      }
    },
  );
  await Promise.all(workers);
}

const locatorCache = new Map<string, Locator>();
const templateCache = new Map<string, SandpackTemplate | null>();

async function getLocatorAndTemplate(
  assignmentId: string,
): Promise<{ loc: Locator; template: SandpackTemplate | null } | null> {
  const cachedLoc = locatorCache.get(assignmentId);
  const cachedTmpl = templateCache.get(assignmentId);
  if (cachedLoc && cachedTmpl !== undefined) {
    return { loc: cachedLoc, template: cachedTmpl };
  }
  const row = await db.attachment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      courseId: true,
      sandboxTemplate: true,
      course: {
        select: { createdBy: { select: { organizationId: true } } },
      },
    },
  });
  if (!row) return null;
  const loc = buildLocator(row);
  const template = row.sandboxTemplate
    ? ((decodeBase64Json(row.sandboxTemplate) as SandpackTemplate | null) ??
      null)
    : null;
  locatorCache.set(assignmentId, loc);
  templateCache.set(assignmentId, template);
  return { loc, template };
}

async function migrateAttachment(row: {
  id: string;
  courseId: string | null;
  course: { createdBy: { organizationId: string | null } } | null;
  sandboxTemplate: string | null;
  hiddenTestFiles: unknown;
  stats: Stats;
}): Promise<void> {
  row.stats.scanned += 1;
  const loc = buildLocator(row);
  locatorCache.set(row.id, loc);
  try {
    if (!row.sandboxTemplate && !row.hiddenTestFiles) {
      row.stats.skipped += 1;
      return;
    }
    if (args.mode === "dry-run") {
      row.stats.migrated += 1;
      return;
    }
    if (await hasTemplate(loc)) {
      row.stats.skipped += 1;
      return;
    }
    // Merge hiddenTestFiles into template.files with hidden:true. Idempotent
    // via the hasTemplate guard above.
    const decodedTemplate = (decodeBase64Json(
      row.sandboxTemplate,
    ) as SandpackTemplateShape | null) ?? {
      files: {},
    };
    const hiddenFiles =
      row.hiddenTestFiles && typeof row.hiddenTestFiles === "object"
        ? toFilesMap(row.hiddenTestFiles)
        : {};
    const mergedFiles: Record<string, unknown> = {
      ...((decodedTemplate.files ?? {}) as Record<string, unknown>),
    };
    for (const [path, code] of Object.entries(hiddenFiles)) {
      const normalised = path.startsWith("/") ? path : `/${path}`;
      const existing = mergedFiles[normalised];
      mergedFiles[normalised] =
        existing && typeof existing === "object"
          ? { ...(existing as object), code, hidden: true }
          : { code, hidden: true };
    }
    const merged: SandpackTemplateShape = {
      ...decodedTemplate,
      files: mergedFiles,
    };
    await writeSandpackTemplate(loc, merged);
    row.stats.migrated += 1;
  } catch (err) {
    row.stats.errors += 1;
    console.error("attachment migration error", row.id, err);
  }
}

async function migrateSubmission(row: {
  id: string;
  attachmentId: string;
  data: unknown;
  stats: Stats;
}): Promise<void> {
  row.stats.scanned += 1;
  try {
    const raw = toFilesMap(row.data);
    if (Object.keys(raw).length === 0) {
      row.stats.skipped += 1;
      return;
    }
    const ctx = await getLocatorAndTemplate(row.attachmentId);
    if (!ctx) {
      row.stats.errors += 1;
      console.warn("  no locator for submission", row.id, row.attachmentId);
      return;
    }
    // Drop hidden/solution/test-by-flag paths — they live in template only.
    const files = ctx.template ? filterSubmissionInput(raw, ctx.template) : raw;
    if (Object.keys(files).length === 0) {
      row.stats.skipped += 1;
      return;
    }
    if (args.mode === "dry-run") {
      row.stats.migrated += 1;
      return;
    }
    if (await hasSubmission(ctx.loc, row.id)) {
      row.stats.skipped += 1;
      return;
    }
    await writeSubmission(ctx.loc, row.id, files);
    row.stats.migrated += 1;
  } catch (err) {
    row.stats.errors += 1;
    console.error("submission migration error", row.id, err);
  }
}

async function processAttachments(): Promise<Stats> {
  const stats = newStats();
  let cursor: string | undefined;
  for (;;) {
    const batch = await db.attachment.findMany({
      where: {
        OR: [
          { sandboxTemplate: { not: null } },
          { hiddenTestFiles: { not: null } as never },
        ],
      },
      orderBy: { id: "asc" },
      take: args.batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        courseId: true,
        sandboxTemplate: true,
        hiddenTestFiles: true,
        course: { select: { createdBy: { select: { organizationId: true } } } },
      },
    });
    if (batch.length === 0) break;
    cursor = batch[batch.length - 1]!.id;
    await pmap(batch, args.concurrency, (row) =>
      migrateAttachment({ ...row, stats }),
    );
    console.log(
      `  attachments scanned=${stats.scanned} migrated=${stats.migrated} skipped=${stats.skipped} errors=${stats.errors}`,
    );
    if (batch.length < args.batchSize) break;
  }
  return stats;
}

async function processSubmissions(): Promise<Stats> {
  const stats = newStats();
  if (args.limitPerAssignment) {
    const assignmentIds = (
      await db.submission.findMany({
        where: { data: { not: null } as never },
        select: { attachmentId: true },
        distinct: ["attachmentId"],
      })
    ).map((r) => r.attachmentId);
    console.log(
      `  sampling up to ${args.limitPerAssignment} subs across ${assignmentIds.length} assignments`,
    );
    for (const aid of assignmentIds) {
      const rows = await db.submission.findMany({
        where: { attachmentId: aid, data: { not: null } as never },
        take: args.limitPerAssignment,
        orderBy: { id: "asc" },
        select: { id: true, attachmentId: true, data: true },
      });
      await pmap(rows, args.concurrency, (row) =>
        migrateSubmission({ ...row, stats }),
      );
    }
    console.log(
      `  submissions scanned=${stats.scanned} migrated=${stats.migrated} skipped=${stats.skipped} errors=${stats.errors}`,
    );
    return stats;
  }
  let cursor: string | undefined;
  for (;;) {
    const batch = await db.submission.findMany({
      where: { data: { not: null } as never },
      orderBy: { id: "asc" },
      take: args.batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, attachmentId: true, data: true },
    });
    if (batch.length === 0) break;
    cursor = batch[batch.length - 1]!.id;
    await pmap(batch, args.concurrency, (row) =>
      migrateSubmission({ ...row, stats }),
    );
    console.log(
      `  submissions scanned=${stats.scanned} migrated=${stats.migrated} skipped=${stats.skipped} errors=${stats.errors}`,
    );
    if (batch.length < args.batchSize) break;
  }
  return stats;
}

async function main() {
  console.log(`db → storage migration: mode=${args.mode}`);
  console.log(`target: ${env.STORAGE_S3_ENDPOINT}/${env.STORAGE_S3_BUCKET}`);
  if (args.limitPerAssignment) {
    console.log(`limit-per-assignment: ${args.limitPerAssignment}`);
  }
  console.log(`db: ${databaseUrl.replace(/:[^:@]+@/, ":***@")}`);

  console.log("\n→ attachments (templates + hidden tests)");
  const a = await processAttachments();
  console.log("\n→ submissions");
  const s = await processSubmissions();

  console.log("\n=== summary ===");
  console.log(
    `  attachments: scanned=${a.scanned} migrated=${a.migrated} skipped=${a.skipped} errors=${a.errors}`,
  );
  console.log(
    `  submissions: scanned=${s.scanned} migrated=${s.migrated} skipped=${s.skipped} errors=${s.errors}`,
  );
  process.exit(a.errors > 0 || s.errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
