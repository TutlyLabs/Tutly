import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  requireAssignmentReadAccess,
  requireSubmissionReadAccess,
  requireSubmissionReviewAccess,
} from "../lib/workspace-access";
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

function scoreReportedResults(
  results: Array<z.infer<typeof reportedTestSchema>>,
  cases: Array<{ id: string; points: number }>,
) {
  const pointsByCase = new Map(cases.map((testCase) => [testCase.id, testCase.points]));
  const lacksCaseMapping =
    results.length > 0 &&
    results.every((result) => result.testCaseId === undefined && result.points === undefined);

  if (cases.length === 1 && lacksCaseMapping) {
    const casePoints = cases[0]?.points ?? 1;
    const perResultPoints = casePoints / results.length;
    const normalized = results.map((result) => ({
      ...result,
      points: perResultPoints,
    }));
    const scoreRaw = normalized.reduce(
      (total, result) => total + (result.passed ? result.points : 0),
      0,
    );

    return {
      normalized,
      score: Math.round(scoreRaw),
      maxScore: Math.round(casePoints),
      passed: normalized.filter((result) => result.passed).length,
      total: normalized.length,
    };
  }

  const normalized = results.map((result) => {
    const points =
      result.points ?? (result.testCaseId ? pointsByCase.get(result.testCaseId) : undefined) ?? 1;
    return { ...result, points };
  });

  const scoreRaw = normalized.reduce(
    (total, result) => total + (result.passed ? result.points : 0),
    0,
  );
  const maxScoreRaw =
    cases.length > 0
      ? cases.reduce((total, testCase) => total + testCase.points, 0)
      : normalized.reduce((total, result) => total + result.points, 0);

  return {
    normalized,
    score: Math.round(scoreRaw),
    maxScore: Math.round(maxScoreRaw),
    passed: normalized.filter((result) => result.passed).length,
    total: cases.length > 0 ? cases.length : normalized.length,
  };
}

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
        provider: z.enum(["LOCAL", "SSH"]).default("SSH"),
        serviceConnectionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const submission = await requireSubmissionReviewAccess(ctx, input.submissionId);
      const testCases = await ctx.db.assignmentTestCase.findMany({
        where: { assignmentId: submission.attachmentId },
        select: { visibility: true, points: true },
      });
      const hiddenTotal = testCases.filter((testCase) => testCase.visibility === "HIDDEN").length;
      const maxScore = testCases.reduce((total, testCase) => total + testCase.points, 0);

      const run = await ctx.db.submissionTestRun.create({
        data: {
          submissionId: submission.id,
          assignmentId: submission.attachmentId,
          serviceConnectionId: input.serviceConnectionId ?? null,
          provider: input.provider,
          trigger: "official",
          status: hiddenTotal > 0 ? "QUEUED" : "PASSED",
          hiddenTotal,
          visibleTotal: testCases.length - hiddenTotal,
          maxScore,
          outputSummary: {
            queued: hiddenTotal > 0,
            trustedRunnerRequired: hiddenTotal > 0,
          } as never,
        },
      });

      await ctx.db.submissionReview.upsert({
        where: { submissionId: submission.id },
        create: {
          submissionId: submission.id,
          assignmentId: submission.attachmentId,
          status: hiddenTotal > 0 ? "NEEDS_REVIEW" : "AUTO_SCORED",
          testRunId: run.id,
          maxScore,
        },
        update: {
          status: hiddenTotal > 0 ? "NEEDS_REVIEW" : "AUTO_SCORED",
          testRunId: run.id,
          maxScore,
        },
      });

      return { success: true, data: run };
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

      return { success: true, data: runs };
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
});
