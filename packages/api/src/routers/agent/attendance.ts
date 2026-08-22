import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Prisma } from "@tutly/db/browser";

import {
  requireClassManageAccess,
  requireClassReadAccess,
} from "../../lib/authorization";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { dryRunSchema, requireGrant } from "./shared";

/**
 * One row of a meeting participant report, already parsed out of whatever the
 * provider exported.
 *
 * Parsing is deliberately the caller's job. Zoom, Meet and Teams each export a
 * different shape, and the browser flow only ever handled one of them
 * (`XLSX.read` with a hardcoded header offset). A model reading a spreadsheet
 * is better at that than a fixed parser; identity resolution and the write are
 * what need to be trustworthy, so they live here.
 */
const participantSchema = z.object({
  name: z.string().trim().optional().describe("Display name from the report."),
  email: z.string().trim().optional().describe("Most reliable identifier."),
  username: z.string().trim().optional().describe("Use when already known."),
  durationMinutes: z.number().min(0),
  joinTime: z.string().trim().optional(),
  leaveTime: z.string().trim().optional(),
});

type Participant = z.infer<typeof participantSchema>;

/** Ordered by confidence. Reported per row so a caller can spot weak matches. */
type MatchStrategy = "email" | "username" | "full-name" | "name-prefix";

interface Candidate {
  username: string;
  name: string;
  email: string | null;
}

const NAME_PREFIX_LENGTH = 10;

const norm = (value: string | null | undefined) =>
  value?.trim().toLowerCase() ?? "";

/**
 * Builds one lookup per strategy. A key mapping to more than one enrolled user
 * is dropped from that index: guessing between two people is worse than
 * reporting the row as ambiguous.
 */
function buildIndexes(candidates: Candidate[]) {
  const make = (keyOf: (candidate: Candidate) => string) => {
    const index = new Map<string, Candidate[]>();
    for (const candidate of candidates) {
      const key = keyOf(candidate);
      if (!key) continue;
      const existing = index.get(key);
      if (existing) existing.push(candidate);
      else index.set(key, [candidate]);
    }
    return index;
  };

  return {
    email: make((candidate) => norm(candidate.email)),
    username: make((candidate) => norm(candidate.username)),
    fullName: make((candidate) => norm(candidate.name)),
    // The legacy heuristic: students who set their meeting name to their roll
    // number. Kept last because a rename silently breaks it — which is how the
    // browser flow used to lose people without saying so.
    namePrefix: make((candidate) =>
      norm(candidate.username.slice(0, NAME_PREFIX_LENGTH)),
    ),
  };
}

type Indexes = ReturnType<typeof buildIndexes>;

function resolveParticipant(
  participant: Participant,
  indexes: Indexes,
):
  | { candidate: Candidate; matchedBy: MatchStrategy }
  | { ambiguous: true }
  | null {
  const attempts: Array<[MatchStrategy, Candidate[] | undefined]> = [
    ["email", indexes.email.get(norm(participant.email))],
    ["username", indexes.username.get(norm(participant.username))],
    ["full-name", indexes.fullName.get(norm(participant.name))],
    [
      "name-prefix",
      indexes.namePrefix.get(
        norm(participant.name?.slice(0, NAME_PREFIX_LENGTH)),
      ),
    ],
  ];

  for (const [matchedBy, matches] of attempts) {
    if (!matches || matches.length === 0) continue;
    if (matches.length > 1) return { ambiguous: true };
    return { candidate: matches[0]!, matchedBy };
  }
  return null;
}

export const agentAttendanceRouter = createTRPCRouter({
  /** Who is already recorded for this class, and how the cohort compares. */
  summary: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ ctx, input }) => {
      const cls = await requireClassReadAccess(ctx, input.classId);

      const [records, enrolledCount] = await Promise.all([
        ctx.db.attendance.findMany({
          where: { classId: input.classId },
          select: {
            username: true,
            attended: true,
            attendedDuration: true,
            user: { select: { name: true } },
          },
          orderBy: { username: "asc" },
        }),
        ctx.db.enrolledUsers.count({
          where: { courseId: cls.courseId, user: { role: "STUDENT" } },
        }),
      ]);

      return {
        classId: input.classId,
        courseId: cls.courseId,
        recorded: records.length,
        present: records.filter((record) => record.attended).length,
        enrolledStudents: enrolledCount,
        records: records.map((record) => ({
          username: record.username,
          name: record.user.name,
          attended: record.attended,
          minutes: record.attendedDuration,
        })),
      };
    }),

  /**
   * Reconcile a participant report against the course roster and record
   * attendance.
   *
   * Defaults to a dry run, because the interesting failure is silent: a student
   * who renamed themselves in the meeting simply vanished from the old flow
   * with no warning. Here every row lands in exactly one bucket — matched,
   * ambiguous, unmatched, or notEnrolled — and absentees are listed explicitly.
   */
  import: protectedProcedure
    .input(
      z.object({
        classId: z.string(),
        participants: z.array(participantSchema).min(1).max(2000),
        minimumMinutes: z
          .number()
          .min(0)
          .describe("Minutes required to count as present."),
        /**
         * Attendance is unique per (username, class), and the existing
         * `postAttendance` uses `createMany` with no conflict handling — so a
         * re-import after fixing a name used to fail outright. Re-importing is
         * the normal case when reconciling, so overwriting is the default.
         */
        overwriteExisting: z.boolean().default(true),
        dryRun: dryRunSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireGrant(ctx.session, "attendance", "create");
      const cls = await requireClassManageAccess(ctx, input.classId);

      const enrolled = await ctx.db.enrolledUsers.findMany({
        where: { courseId: cls.courseId },
        select: {
          username: true,
          user: { select: { name: true, email: true } },
        },
      });

      if (enrolled.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No users are enrolled in this course",
        });
      }

      const candidates: Candidate[] = enrolled.map((enrolment) => ({
        username: enrolment.username,
        name: enrolment.user.name,
        email: enrolment.user.email,
      }));
      const indexes = buildIndexes(candidates);

      // Several join rows per person is normal — a dropped connection produces
      // one row per rejoin. Sum the minutes and keep every interval.
      const aggregated = new Map<
        string,
        {
          candidate: Candidate;
          matchedBy: MatchStrategy;
          minutes: number;
          joins: Array<{
            joinTime: string | null;
            leaveTime: string | null;
            durationMinutes: number;
            reportedName: string | null;
          }>;
        }
      >();
      const ambiguous: Array<{ name?: string; email?: string }> = [];
      const unmatched: Array<{ name?: string; email?: string }> = [];

      for (const participant of input.participants) {
        const resolution = resolveParticipant(participant, indexes);

        if (!resolution) {
          unmatched.push({ name: participant.name, email: participant.email });
          continue;
        }
        if ("ambiguous" in resolution) {
          ambiguous.push({ name: participant.name, email: participant.email });
          continue;
        }

        const { candidate, matchedBy } = resolution;
        const existing = aggregated.get(candidate.username);
        const join = {
          joinTime: participant.joinTime ?? null,
          leaveTime: participant.leaveTime ?? null,
          durationMinutes: participant.durationMinutes,
          reportedName: participant.name ?? null,
        };

        if (existing) {
          existing.minutes += participant.durationMinutes;
          existing.joins.push(join);
          // Keep the strongest evidence seen for this person.
          if (matchedBy === "email") existing.matchedBy = "email";
        } else {
          aggregated.set(candidate.username, {
            candidate,
            matchedBy,
            minutes: participant.durationMinutes,
            joins: [join],
          });
        }
      }

      const matched = [...aggregated.values()].map((entry) => ({
        username: entry.candidate.username,
        name: entry.candidate.name,
        minutes: entry.minutes,
        attended: entry.minutes >= input.minimumMinutes,
        matchedBy: entry.matchedBy,
      }));

      const matchedUsernames = new Set(matched.map((row) => row.username));
      const absent = candidates
        .filter((candidate) => !matchedUsernames.has(candidate.username))
        .map((candidate) => ({
          username: candidate.username,
          name: candidate.name,
        }));

      const weakMatches = matched.filter(
        (row) => row.matchedBy === "name-prefix",
      ).length;

      const report = {
        classId: input.classId,
        courseId: cls.courseId,
        minimumMinutes: input.minimumMinutes,
        counts: {
          rowsSubmitted: input.participants.length,
          matched: matched.length,
          present: matched.filter((row) => row.attended).length,
          belowThreshold: matched.filter((row) => !row.attended).length,
          ambiguous: ambiguous.length,
          unmatched: unmatched.length,
          notInReport: absent.length,
          weakMatches,
        },
        matched,
        ambiguous,
        // Rows naming nobody on the roster: a guest, a typo, or someone who
        // should be enrolled and is not.
        unmatched,
        notInReport: absent,
      };

      if (input.dryRun) return { dryRun: true as const, ...report };

      if (matched.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No participant matched an enrolled user; nothing to write",
        });
      }

      const rows: Prisma.AttendanceCreateManyInput[] = [
        ...aggregated.values(),
      ].map((entry) => ({
        classId: input.classId,
        username: entry.candidate.username,
        attendedDuration: entry.minutes,
        attended: entry.minutes >= input.minimumMinutes,
        data: entry.joins as unknown as Prisma.InputJsonValue[],
      }));

      const written = await ctx.db.$transaction(async (tx) => {
        if (input.overwriteExisting) {
          await tx.attendance.deleteMany({
            where: {
              classId: input.classId,
              username: { in: rows.map((row) => row.username) },
            },
          });
        }
        return tx.attendance.createMany({
          data: rows,
          // Belt and braces when overwriting is off: a partially-imported class
          // should not make the whole retry fail.
          skipDuplicates: !input.overwriteExisting,
        });
      });

      return {
        dryRun: false as const,
        written: written.count,
        ...report,
      };
    }),

  clear: protectedProcedure
    .input(z.object({ classId: z.string(), dryRun: dryRunSchema }))
    .mutation(async ({ ctx, input }) => {
      requireGrant(ctx.session, "attendance", "delete");
      await requireClassManageAccess(ctx, input.classId);

      const existing = await ctx.db.attendance.count({
        where: { classId: input.classId },
      });

      if (input.dryRun) {
        return { dryRun: true as const, wouldDelete: existing };
      }

      const deleted = await ctx.db.attendance.deleteMany({
        where: { classId: input.classId },
      });
      return { dryRun: false as const, deleted: deleted.count };
    }),
});
