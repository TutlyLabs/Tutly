import { timingSafeEqual } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { enqueueTestRun, enqueueTestRunBatch } from "../lib/runner-client";
import {
  recordTestRunOutcome,
  scoreReportedResults,
} from "../lib/test-run-scoring";
import { projectTestRunForViewer } from "../lib/test-visibility";
import {
  canManageAssignment,
  requireAssignmentManageAccess,
  requireAssignmentReadAccess,
  requireSubmissionReadAccess,
} from "../lib/workspace-access";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

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
      const submission = await requireSubmissionReadAccess(ctx, input.submissionId);
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
          feedback: status === "PASSED" ? "Visible tests passed." : "Visible tests need attention.",
          metadata: { trigger: input.trigger, provider: input.provider } as never,
        },
        update: {
          score: score.score,
          maxScore: score.maxScore,
          source: "tests",
          testRunId: run.id,
          feedback: status === "PASSED" ? "Visible tests passed." : "Visible tests need attention.",
          metadata: { trigger: input.trigger, provider: input.provider } as never,
        },
      });

      const reviewStatus =
        hiddenCount > 0 ? "NEEDS_REVIEW" : status === "PASSED" ? "AUTO_SCORED" : "NEEDS_REVIEW";

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

      return { success: true, data: run };
    }),

  enqueueOfficial: protectedProcedure
    .input(
      z.object({
        submissionId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const submission = await requireSubmissionReadAccess(ctx, input.submissionId);
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

      return { success: true, data: run };
    }),

  rerunAllForAssignment: protectedProcedure
    .input(z.object({ assignmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const assignment = await requireAssignmentManageAccess(ctx, input.assignmentId);
      const user = ctx.session!.user;

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
          message: "A bulk rerun was triggered for this assignment in the last 5 minutes",
        });
      }

      const submissions = await ctx.db.submission.findMany({
        where: { attachmentId: assignment.id },
        select: { id: true, _count: { select: { testRuns: true } } },
      });

      if (submissions.length === 0) {
        return { success: true, count: 0 };
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

      return { success: true, count: created.length };
    }),

  reapStaleRuns: protectedProcedure
    .input(z.object({ olderThanMinutes: z.number().int().min(1).default(10) }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session?.user;
      if (!user || (user.role !== "INSTRUCTOR" && !user.isAdmin)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const cutoff = new Date(Date.now() - input.olderThanMinutes * 60 * 1000);
      const result = await ctx.db.submissionTestRun.updateMany({
        where: {
          status: "RUNNING",
          startedAt: { lt: cutoff },
        },
        data: {
          status: "ERROR",
          errorMessage: "runner timeout (reaped)",
          completedAt: new Date(),
        },
      });

      return { success: true, reaped: result.count };
    }),

  recordOfficial: protectedProcedure
    .input(
      z.object({
        testRunId: z.string(),
        results: z.array(reportedTestSchema).default([]),
        logsArtifactId: z.string().optional(),
        reportArtifactId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const run = await ctx.db.submissionTestRun.findUnique({
        where: { id: input.testRunId },
        include: {
          submission: {
            include: {
              enrolledUser: true,
              assignment: {
                include: {
                  course: {
                    include: {
                      courseAdmins: { select: { id: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!run) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Test run not found" });
      }

      const user = ctx.session.user;
      const canRecord =
        user.role === "INSTRUCTOR" ||
        user.role === "ADMIN" ||
        user.role === "SUPER_ADMIN" ||
        run.submission.assignment.course?.createdById === user.id ||
        run.submission.assignment.course?.courseAdmins.some((admin) => admin.id === user.id);

      if (!canRecord) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only trusted instructors/runners can record official results.",
        });
      }

      const testCases = await ctx.db.assignmentTestCase.findMany({
        where: { assignmentId: run.assignmentId },
        select: { id: true, points: true, visibility: true },
      });
      const score = scoreReportedResults(input.results, testCases);
      const hiddenResults = score.normalized.filter(
        (result) => result.visibility === "HIDDEN",
      );
      const visibleResults = score.normalized.filter(
        (result) => result.visibility !== "HIDDEN",
      );
      const status = score.score >= score.maxScore ? "PASSED" : "FAILED";
      const completedAt = new Date();

      const updatedRun = await ctx.db.submissionTestRun.update({
        where: { id: run.id },
        data: {
          status,
          visiblePassed: visibleResults.filter((result) => result.passed).length,
          visibleTotal: visibleResults.length,
          hiddenPassed: hiddenResults.filter((result) => result.passed).length,
          hiddenTotal: hiddenResults.length,
          score: score.score,
          maxScore: score.maxScore,
          outputSummary: {
            results: score.normalized,
            source: "trusted-official-runner",
          } as never,
          logsArtifactId: input.logsArtifactId ?? run.logsArtifactId,
          reportArtifactId: input.reportArtifactId ?? run.reportArtifactId,
          startedAt: run.startedAt ?? completedAt,
          completedAt,
        },
      });

      await ctx.db.point.upsert({
        where: {
          submissionId_category: {
            submissionId: run.submissionId,
            category: "TESTS",
          },
        },
        create: {
          submissionId: run.submissionId,
          category: "TESTS",
          score: score.score,
          maxScore: score.maxScore,
          source: "official_tests",
          testRunId: run.id,
          feedback: status === "PASSED" ? "Official tests passed." : "Official tests need review.",
          metadata: { provider: run.provider, trigger: run.trigger } as never,
        },
        update: {
          score: score.score,
          maxScore: score.maxScore,
          source: "official_tests",
          testRunId: run.id,
          feedback: status === "PASSED" ? "Official tests passed." : "Official tests need review.",
          metadata: { provider: run.provider, trigger: run.trigger } as never,
        },
      });

      await ctx.db.submissionReview.upsert({
        where: { submissionId: run.submissionId },
        create: {
          submissionId: run.submissionId,
          assignmentId: run.assignmentId,
          status: status === "PASSED" ? "AUTO_SCORED" : "NEEDS_REVIEW",
          autoScore: score.score,
          maxScore: score.maxScore,
          testRunId: run.id,
        },
        update: {
          status: status === "PASSED" ? "AUTO_SCORED" : "NEEDS_REVIEW",
          autoScore: score.score,
          maxScore: score.maxScore,
          testRunId: run.id,
        },
      });

      return { success: true, data: updatedRun };
    }),

  getForSubmission: protectedProcedure
    .input(z.object({ submissionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const submission = await requireSubmissionReadAccess(ctx, input.submissionId);
      const runs = await ctx.db.submissionTestRun.findMany({
        where: { submissionId: submission.id },
        orderBy: { createdAt: "desc" },
      });

      const user = ctx.session!.user;
      const isOwner = submission.enrolledUser.username === user.username;
      const projected = runs.map((run) =>
        projectTestRunForViewer(
          run,
          { dueDate: submission.assignment.dueDate ?? null },
          { role: user.role, isOwnerOfSubmission: isOwner },
        ),
      );

      return { success: true, data: projected };
    }),

  getForAssignment: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string(),
        status: z.enum(["QUEUED", "RUNNING", "PASSED", "FAILED", "ERROR", "CANCELLED"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireAssignmentReadAccess(ctx, input.assignmentId);
      const runs = await ctx.db.submissionTestRun.findMany({
        where: {
          assignmentId: input.assignmentId,
          status: input.status,
        },
        include: {
          submission: {
            include: {
              enrolledUser: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return { success: true, data: runs };
    }),

  recordByService: publicProcedure
    .input(
      z.object({
        testRunId: z.string(),
        status: z.enum(["PASSED", "FAILED", "ERROR"]),
        results: z.array(reportedTestSchema).default([]),
        jestReport: z.any().optional(),
        errorMessage: z.string().optional(),
        logsArtifactId: z.string().optional(),
        reportArtifactId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const provided = ctx.headers.get("x-service-token") ?? "";
      const expected = process.env.TEST_RUNNER_SECRET ?? "";
      if (!expected) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Runner secret not configured",
        });
      }
      const a = Buffer.from(provided);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const result = await recordTestRunOutcome(ctx.db, input);
      if (!result.ok) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Test run not found" });
      }
      return { success: true, ...result };
    }),
});
