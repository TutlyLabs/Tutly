#!/usr/bin/env tsx

// Verify migrated rows in @tutly/storage match the DB inline columns
// byte-for-byte. Samples each reader path.
//
// Usage:
//   pnpm tsx --env-file=apps/web/.env apps/web/scripts/verify-storage-end-to-end.ts
//   pnpm tsx --env-file=apps/web/.env apps/web/scripts/verify-storage-end-to-end.ts --sample=30

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@tutly/db/client";
import {
  env,
  readSandpackTemplate,
  readSubmission,
  type Locator,
} from "@tutly/storage";

import {
  mergeForAudience,
  type SandpackTemplate,
} from "../../../packages/api/src/lib/template-policy";

const SAMPLE_FLAG = process.argv.find((a) => a.startsWith("--sample="));
const SAMPLE = SAMPLE_FLAG ? Math.max(1, Number(SAMPLE_FLAG.slice(9))) : 30;

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type Result = {
  ok: number;
  bad: number;
  missing: number;
  files: number;
  bytes: number;
};
const newResult = (): Result => ({
  ok: 0,
  bad: 0,
  missing: 0,
  files: 0,
  bytes: 0,
});

function inlineToMap(input: unknown): Record<string, string> {
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

function compareFiles(
  a: Record<string, string>,
  b: Record<string, string>,
): { matched: boolean; bytes: number; files: number } {
  const ak = Object.keys(a).sort();
  const bk = Object.keys(b).sort();
  if (ak.length !== bk.length) return { matched: false, bytes: 0, files: 0 };
  let bytes = 0;
  for (let i = 0; i < ak.length; i++) {
    if (ak[i] !== bk[i]) return { matched: false, bytes: 0, files: 0 };
    if (a[ak[i]!] !== b[bk[i]!]) return { matched: false, bytes: 0, files: 0 };
    bytes += a[ak[i]!]!.length;
  }
  return { matched: true, bytes, files: ak.length };
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

const locatorSelect = {
  id: true,
  courseId: true,
  course: { select: { createdBy: { select: { organizationId: true } } } },
} as const;

async function verifySubmissions() {
  console.log(`\n→ submissions (sample of ${SAMPLE})`);
  const res = newResult();
  const subs = await db.submission.findMany({
    where: { data: { not: null } as never },
    take: SAMPLE,
    orderBy: { id: "asc" },
    select: {
      id: true,
      data: true,
      attachmentId: true,
      assignment: { select: locatorSelect },
    },
  });
  for (const s of subs) {
    try {
      const loc = buildLocator(s.assignment);
      const fromStorage = await readSubmission(loc, s.id);
      if (!fromStorage) {
        res.missing += 1;
        continue;
      }
      // Storage submission holds only editable files. Merge with the current
      // template (runner view = full) and compare against the full inline map.
      const template = (await readSandpackTemplate(
        loc,
      )) as SandpackTemplate | null;
      const merged = template
        ? (mergeForAudience(template, fromStorage, "runner").files ?? {})
        : fromStorage;
      const inline = inlineToMap(s.data);
      const cmp = compareFiles(merged as Record<string, string>, inline);
      if (cmp.matched) {
        res.ok += 1;
        res.files += cmp.files;
        res.bytes += cmp.bytes;
      } else {
        res.bad += 1;
        console.warn(`  sub ${s.id}: parity miss`);
      }
    } catch (err) {
      res.bad += 1;
      console.warn(`  sub ${s.id}: read error`, err);
    }
  }
  console.log(
    `  sampled=${subs.length} ok=${res.ok} bad=${res.bad} missing=${res.missing} files=${res.files} bytes=${(res.bytes / 1024).toFixed(1)}KB`,
  );
  return res;
}

async function verifyTemplates() {
  console.log(`\n→ templates (sample of ${SAMPLE})`);
  const res = newResult();
  const rows = await db.attachment.findMany({
    where: { sandboxTemplate: { not: null } },
    take: SAMPLE,
    orderBy: { id: "asc" },
    select: { ...locatorSelect, sandboxTemplate: true },
  });
  for (const a of rows) {
    try {
      const loc = buildLocator(a);
      const fromStorage = await readSandpackTemplate(loc);
      if (!fromStorage) {
        res.missing += 1;
        continue;
      }
      let inlineDecoded: { files?: Record<string, unknown> } = {};
      try {
        inlineDecoded = JSON.parse(
          Buffer.from(a.sandboxTemplate!, "base64").toString("utf-8"),
        );
      } catch {
        /* skip */
      }
      const storageFiles = inlineToMap(
        (fromStorage as { files?: unknown }).files ?? {},
      );
      const inlineFiles = inlineToMap(inlineDecoded.files ?? {});
      const cmp = compareFiles(storageFiles, inlineFiles);
      if (cmp.matched) {
        res.ok += 1;
        res.files += cmp.files;
        res.bytes += cmp.bytes;
      } else {
        res.bad += 1;
        console.warn(`  tmpl ${a.id}: parity miss`);
      }
    } catch (err) {
      res.bad += 1;
      console.warn(`  tmpl ${a.id}: read error`, err);
    }
  }
  console.log(
    `  sampled=${rows.length} ok=${res.ok} bad=${res.bad} missing=${res.missing} files=${res.files} bytes=${(res.bytes / 1024).toFixed(1)}KB`,
  );
  return res;
}

async function verifyHiddenMergedIntoTemplate() {
  console.log(`\n→ hidden tests merged into template (sample of ${SAMPLE})`);
  const res = newResult();
  const rows = await db.attachment.findMany({
    where: { hiddenTestFiles: { not: null } as never },
    take: SAMPLE,
    orderBy: { id: "asc" },
    select: { ...locatorSelect, hiddenTestFiles: true },
  });
  for (const a of rows) {
    try {
      const loc = buildLocator(a);
      const tmpl = await readSandpackTemplate(loc);
      const tmplFiles = (tmpl?.files ?? {}) as Record<string, unknown>;
      const inline = inlineToMap(a.hiddenTestFiles);
      let missing = 0;
      for (const [path, expected] of Object.entries(inline)) {
        const norm = path.startsWith("/") ? path : `/${path}`;
        const entry = tmplFiles[norm];
        const code =
          typeof entry === "string"
            ? entry
            : entry && typeof entry === "object"
              ? (entry as { code?: unknown }).code
              : undefined;
        const hidden =
          entry &&
          typeof entry === "object" &&
          (entry as { hidden?: unknown }).hidden === true;
        if (!hidden || code !== expected) missing += 1;
      }
      if (missing === 0) {
        res.ok += 1;
        res.files += Object.keys(inline).length;
      } else {
        res.bad += 1;
        console.warn(
          `  attachment ${a.id}: ${missing} hidden test(s) not merged into template`,
        );
      }
    } catch (err) {
      res.bad += 1;
      console.warn(`  attachment ${a.id}: read error`, err);
    }
  }
  console.log(
    `  sampled=${rows.length} ok=${res.ok} bad=${res.bad} missing=${res.missing} files=${res.files}`,
  );
  return res;
}

async function main() {
  console.log(
    `storage verify: ${env.STORAGE_S3_ENDPOINT}/${env.STORAGE_S3_BUCKET}`,
  );

  const s = await verifySubmissions();
  const t = await verifyTemplates();
  const h = await verifyHiddenMergedIntoTemplate();

  console.log("\n=== final summary ===");
  const totalOk = s.ok + t.ok + h.ok;
  const totalBad = s.bad + t.bad + h.bad;
  const totalMissing = s.missing + t.missing + h.missing;
  console.log(`total: ok=${totalOk} bad=${totalBad} missing=${totalMissing}`);
  if (totalBad === 0 && totalMissing === 0) {
    console.log("✓ ALL STORAGE READS MATCH DB INLINE COLUMNS");
  }
  process.exit(totalBad + totalMissing === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
