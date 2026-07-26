import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  canManageAssignment,
  requireAssignmentManageAccess,
  requireSubmissionReadAccess,
} from "../lib/authorization";
import { enqueueTestRun, enqueueTestRunBatch } from "../lib/runner-client";
import { scoreReportedResults } from "../lib/test-run-scoring";
import { projectTestRunForViewer } from "../lib/test-visibility";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const reportedTestSchema = z.object({
  testCaseId: z.string().optional(),
  title: z.string(),
  visibility: z.enum(["VISIBLE", "HIDDEN"]).default("VISIBLE"),
  passed: z.boolean(),
  points: z.number().int().min(0).optional(),
  durationMs: z.number().int().min(0).optional(),
  output: z.string().optional(),
  error: z.string().optional(),
  metadata: z.any().optional(),
});

export const testRunsRouter = createTRPCRouter({
  runVisible: protectedProcedure
    .input(
      z.object({
        submissionId: z.string(),
        provider: z.enum(["LOCAL", "SSH"]).default("LOCAL"),
        serviceConnectionId: z.string().optional(),
        trigger: z.string().default("student-visible"),
        logsArtifactId: z.string().optional(),
        reportArtifactId: z.string().optional(),
        results: z.array(reportedTestSchema).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const submission = await requireSubmissionReadAccess(
        ctx,
        input.submissionId,
      );
      const visibleResults = input.results.filter(
        (result) => result.visibility !== "HIDDEN",
      );

      if (visibleResults.length !== input.results.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Hidden test results must be recorded by a trusted runner.",
        });
      }

      const [visibleCases, hiddenCount] = await Promise.all([
        ctx.db.assignmentTestCase.findMany({
          where: {
            assignmentId: submission.attachmentId,
            visibility: "VISIBLE",
          },
          select: { id: true, points: true },
        }),
        ctx.db.assignmentTestCase.count({
          where: {
            assignmentId: submission.attachmentId,
            visibility: "HIDDEN",
          },
        }),
      ]);

      const score = scoreReportedResults(visibleResults, visibleCases);
      const status = score.score >= score.maxScore ? "PASSED" : "FAILED";
      const completedAt = new Date();

      const run = await ctx.db.submissionTestRun.create({
        data: {
          submissionId: submission.id,
          assignmentId: submission.attachmentId,
          serviceConnectionId: input.serviceConnectionId ?? null,
          provider: input.provider,
          trigger: input.trigger,
          status,
          visiblePassed: score.passed,
          visibleTotal: score.total,
          hiddenPassed: 0,
          hiddenTotal: hiddenCount,
          score: score.score,
          maxScore: score.maxScore,
          outputSummary: {
            results: score.normalized,
            source: "visible-agent",
          } as never,
          logsArtifactId: input.logsArtifactId ?? null,
          reportArtifactId: input.reportArtifactId ?? null,
          startedAt: completedAt,
          completedAt,
        },
      });

      await ctx.db.point.upsert({
        where: {
          submissionId_category: {
            submissionId: submission.id,
            category: "TESTS",
          },
        },
        create: {
          submissionId: submission.id,
          category: "TESTS",
          score: score.score,
          maxScore: score.maxScore,
          source: "tests",
          testRunId: run.id,
          feedback:
            status === "PASSED"
              ? "Visible tests passed."
              : "Visible tests need attention.",
          metadata: {
            trigger: input.trigger,
            provider: input.provider,
          } as never,
        },
        update: {
          score: score.score,
          maxScore: score.maxScore,
          source: "tests",
          testRunId: run.id,
          feedback:
            status === "PASSED"
              ? "Visible tests passed."
              : "Visible tests need attention.",
          metadata: {
            trigger: input.trigger,
            provider: input.provider,
          } as never,
        },
      });

      const reviewStatus =
        hiddenCount > 0
          ? "NEEDS_REVIEW"
          : status === "PASSED"
            ? "AUTO_SCORED"
            : "NEEDS_REVIEW";

      await ctx.db.submissionReview.upsert({
        where: { submissionId: submission.id },
        create: {
          submissionId: submission.id,
          assignmentId: submission.attachmentId,
          status: reviewStatus,
          autoScore: score.score,
          maxScore: score.maxScore,
          testRunId: run.id,
        },
        update: {
          status: reviewStatus,
          autoScore: score.score,
          maxScore: score.maxScore,
          testRunId: run.id,
        },
      });

      return run;
    }),

  enqueueOfficial: protectedProcedure
    .input(
      z.object({
        submissionId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const submission = await requireSubmissionReadAccess(
        ctx,
        input.submissionId,
      );
      const user = ctx.session?.user;
      if (!user || !canManageAssignment(user, submission.assignment)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only instructors can rerun tests",
        });
      }

      const previousAttempts = await ctx.db.submissionTestRun.count({
        where: { submissionId: submission.id },
      });

      const run = await ctx.db.submissionTestRun.create({
        data: {
          submissionId: submission.id,
          assignmentId: submission.attachmentId,
          provider: "LOCAL",
          trigger: "instructor-rerun",
          status: "QUEUED",
          attempt: previousAttempts + 1,
          triggeredByUserId: user.id,
          outputSummary: { queued: true } as never,
        },
      });

      await ctx.db.submissionReview.upsert({
        where: { submissionId: submission.id },
        create: {
          submissionId: submission.id,
          assignmentId: submission.attachmentId,
          status: "NEEDS_REVIEW",
          testRunId: run.id,
        },
        update: {
          status: "NEEDS_REVIEW",
          testRunId: run.id,
        },
      });

      void enqueueTestRun(run.id);

      return run;
    }),

  rerunAllForAssignment: protectedProcedure
    .input(z.object({ assignmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await requireAssignmentManageAccess(
        ctx,
        input.assignmentId,
      );
      const user = ctx.session.user;

      const recentBulk = await ctx.db.submissionTestRun.count({
        where: {
          assignmentId: assignment.id,
          trigger: "rerun-all",
          createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) },
        },
      });
      if (recentBulk > 0) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            "A bulk rerun was triggered for this assignment in the last 5 minutes",
        });
      }

      const submissions = await ctx.db.submission.findMany({
        where: { attachmentId: assignment.id },
        select: { id: true, _count: { select: { testRuns: true } } },
      });

      if (submissions.length === 0) {
        return { count: 0 };
      }

      const created = await ctx.db.$transaction(
        submissions.map((submission) =>
          ctx.db.submissionTestRun.create({
            data: {
              submissionId: submission.id,
              assignmentId: assignment.id,
              provider: "LOCAL",
              trigger: "rerun-all",
              status: "QUEUED",
              attempt: submission._count.testRuns + 1,
              triggeredByUserId: user.id,
              outputSummary: { queued: true } as never,
            },
          }),
        ),
      );

      void enqueueTestRunBatch(created.map((run) => run.id));

      return { count: created.length };
    }),

  getForSubmission: protectedProcedure
    .input(z.object({ submissionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const submission = await requireSubmissionReadAccess(
        ctx,
        input.submissionId,
      );
      const runs = await ctx.db.submissionTestRun.findMany({
        where: { submissionId: submission.id },
        orderBy: { createdAt: "desc" },
      });

      const user = ctx.session.user;
      const isOwner = submission.enrolledUser.username === user.username;
      const projected = runs.map((run) =>
        projectTestRunForViewer(
          run,
          { dueDate: submission.assignment.dueDate ?? null },
          { role: user.role, isOwnerOfSubmission: isOwner },
        ),
      );

      return projected;
    }),
});
