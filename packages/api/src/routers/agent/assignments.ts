import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  requireAssignmentManageAccess,
  requireAssignmentReadAccess,
  requireClassManageAccess,
  requireCourseManageAccess,
  requireCourseReadAccess,
} from "../../lib/authorization";
import { defaultWorkspaceConfig } from "../../lib/workspace-config";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import {
  assertUniqueTestCaseTitles,
  dryRunSchema,
  isoDateSchema,
  requireGrant,
  submissionModeSchema,
  testCaseSchema,
  titleSchema,
  workspaceConfigSchema,
} from "./shared";

export const agentAssignmentsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          courseId: z.string().optional(),
          classId: z.string().optional(),
        })
        .refine((value) => value.courseId ?? value.classId, {
          message: "Pass courseId or classId",
        }),
    )
    .query(async ({ ctx, input }) => {
      if (input.classId) {
        await requireClassManageAccess(ctx, input.classId);
      } else if (input.courseId) {
        await requireCourseReadAccess(ctx, input.courseId);
      }

      const assignments = await ctx.db.attachment.findMany({
        where: input.classId
          ? { classId: input.classId }
          : {
              OR: [
                { courseId: input.courseId },
                { class: { courseId: input.courseId } },
              ],
            },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          attachmentType: true,
          submissionMode: true,
          dueDate: true,
          maxSubmissions: true,
          classId: true,
          class: { select: { id: true, title: true } },
          _count: {
            select: {
              testCases: true,
              submissions: { where: { status: "SUBMITTED" } },
            },
          },
        },
      });

      return assignments.map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        attachmentType: assignment.attachmentType,
        submissionMode: assignment.submissionMode,
        dueDate: assignment.dueDate,
        maxSubmissions: assignment.maxSubmissions,
        class: assignment.class,
        testCaseCount: assignment._count.testCases,
        submittedCount: assignment._count.submissions,
      }));
    }),

  /** Authoring view: the assignment plus its workspace config and tests. */
  get: protectedProcedure
    .input(z.object({ assignmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireAssignmentReadAccess(ctx, input.assignmentId);

      const assignment = await ctx.db.attachment.findUnique({
        where: { id: input.assignmentId },
        include: {
          workspaceConfig: true,
          testCases: {
            orderBy: [{ visibility: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              title: true,
              command: true,
              visibility: true,
              points: true,
              timeoutMs: true,
            },
          },
          class: { select: { id: true, title: true, courseId: true } },
          _count: { select: { submissions: true } },
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found",
        });
      }

      const totalPoints = assignment.testCases.reduce(
        (sum, testCase) => sum + testCase.points,
        0,
      );

      return {
        id: assignment.id,
        title: assignment.title,
        details: assignment.details,
        link: assignment.link,
        attachmentType: assignment.attachmentType,
        submissionMode: assignment.submissionMode,
        dueDate: assignment.dueDate,
        maxSubmissions: assignment.maxSubmissions,
        class: assignment.class,
        courseId: assignment.courseId ?? assignment.class?.courseId ?? null,
        workspaceConfig: assignment.workspaceConfig
          ? {
              framework: assignment.workspaceConfig.framework,
              setupCommand: assignment.workspaceConfig.setupCommand,
              devCommand: assignment.workspaceConfig.devCommand,
              testCommand: assignment.workspaceConfig.testCommand,
              previewPorts: assignment.workspaceConfig.previewPorts,
              readonlyPaths: assignment.workspaceConfig.readonlyPaths,
            }
          : null,
        testCases: assignment.testCases,
        totalPoints,
        submissionCount: assignment._count.submissions,
      };
    }),

  /**
   * Creates or updates an assignment, its workspace config and its whole test
   * suite in one transaction, so it cannot be left half-configured.
   */
  upsert: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string().optional(),
        /** Either is enough; a class also fixes the course. */
        classId: z.string().optional(),
        courseId: z.string().optional(),
        title: titleSchema,
        details: z.string().optional(),
        link: z.string().trim().url().optional(),
        dueDate: isoDateSchema.optional(),
        maxSubmissions: z.number().int().min(1).max(100).optional(),
        submissionMode: submissionModeSchema.optional(),
        workspace: workspaceConfigSchema.optional(),
        /** Replaces the suite. Omit to keep it; pass `[]` to clear it. */
        testCases: z.array(testCaseSchema).optional(),
        dryRun: dryRunSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isUpdate = Boolean(input.assignmentId);
      requireGrant(ctx.session, "assignment", isUpdate ? "update" : "create");

      let classId = input.classId ?? null;
      let courseId = input.courseId ?? null;

      if (input.assignmentId) {
        const existing = await requireAssignmentManageAccess(
          ctx,
          input.assignmentId,
        );
        classId ??= existing.classId;
        courseId ??= existing.courseId;
      } else if (!classId && !courseId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Creating an assignment needs classId or courseId",
        });
      }

      // Authorize every scope the write touches.
      if (classId) {
        const cls = await requireClassManageAccess(ctx, classId);
        courseId ??= cls.courseId;
      }
      if (courseId) await requireCourseManageAccess(ctx, courseId);

      if (input.testCases) {
        assertUniqueTestCaseTitles(input.testCases);
        requireGrant(ctx.session, "workspace", "configure");
      }
      if (input.workspace) requireGrant(ctx.session, "workspace", "configure");

      // Test cases only apply to workspace assignments. Made explicit so the
      // caller sees the mode in the dry run rather than discovering it later.
      const configuresWorkspace = Boolean(input.workspace || input.testCases);
      const submissionMode =
        input.submissionMode ?? (configuresWorkspace ? "WORKSPACE" : undefined);

      if (
        configuresWorkspace &&
        submissionMode !== undefined &&
        submissionMode !== "WORKSPACE"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Workspace config and test cases require submissionMode WORKSPACE, got ${submissionMode}`,
        });
      }

      const defaults = defaultWorkspaceConfig();
      const totalPoints = (input.testCases ?? []).reduce(
        (sum, testCase) => sum + testCase.points,
        0,
      );

      if (input.dryRun) {
        return {
          dryRun: true as const,
          action: isUpdate ? ("update" as const) : ("create" as const),
          assignmentId: input.assignmentId ?? null,
          classId,
          courseId,
          title: input.title,
          submissionMode: submissionMode ?? "unchanged",
          testCases: input.testCases
            ? {
                replacing: true,
                count: input.testCases.length,
                totalPoints,
                hidden: input.testCases.filter(
                  (testCase) => testCase.visibility === "HIDDEN",
                ).length,
              }
            : { replacing: false },
        };
      }

      const result = await ctx.db.$transaction(async (tx) => {
        const assignment = input.assignmentId
          ? await tx.attachment.update({
              where: { id: input.assignmentId },
              data: {
                title: input.title,
                ...(input.details !== undefined
                  ? { details: input.details }
                  : {}),
                ...(input.link !== undefined ? { link: input.link } : {}),
                ...(input.dueDate !== undefined
                  ? { dueDate: input.dueDate }
                  : {}),
                ...(input.maxSubmissions !== undefined
                  ? { maxSubmissions: input.maxSubmissions }
                  : {}),
                ...(submissionMode ? { submissionMode } : {}),
                // Re-parents an unlinked assignment onto its class.
                ...(input.classId ? { classId: input.classId } : {}),
              },
            })
          : await tx.attachment.create({
              data: {
                title: input.title,
                details: input.details ?? null,
                link: input.link ?? null,
                dueDate: input.dueDate ?? null,
                maxSubmissions: input.maxSubmissions ?? 1,
                attachmentType: "ASSIGNMENT",
                submissionMode: submissionMode ?? "HTML_CSS_JS",
                classId,
                courseId: classId ? null : courseId,
              },
            });

        if (configuresWorkspace) {
          await tx.assignmentConfig.upsert({
            where: { assignmentId: assignment.id },
            create: {
              assignmentId: assignment.id,
              framework: input.workspace?.framework ?? defaults.framework,
              setupCommand:
                input.workspace?.setupCommand ?? defaults.setupCommand,
              devCommand: input.workspace?.devCommand ?? defaults.devCommand,
              testCommand: input.workspace?.testCommand ?? defaults.testCommand,
              previewPorts:
                input.workspace?.previewPorts ?? defaults.previewPorts,
              readonlyPaths:
                input.workspace?.readonlyPaths ?? defaults.readonlyPaths,
              grading: defaults.grading as never,
              publicTestMetadata: defaults.publicTestMetadata as never,
              defaultProvider: defaults.defaultProvider,
            },
            update: {
              framework: input.workspace?.framework,
              setupCommand: input.workspace?.setupCommand,
              devCommand: input.workspace?.devCommand,
              testCommand: input.workspace?.testCommand,
              previewPorts: input.workspace?.previewPorts,
              readonlyPaths: input.workspace?.readonlyPaths,
            },
          });
        }

        if (input.testCases) {
          // Replaced wholesale: diffing by title would keep a stale command.
          await tx.assignmentTestCase.deleteMany({
            where: { assignmentId: assignment.id },
          });
          if (input.testCases.length > 0) {
            await tx.assignmentTestCase.createMany({
              data: input.testCases.map((testCase) => ({
                assignmentId: assignment.id,
                title: testCase.title,
                command: testCase.command,
                visibility: testCase.visibility,
                points: testCase.points,
                timeoutMs: testCase.timeoutMs,
                metadata: {},
              })),
            });
          }
        }

        return assignment;
      });

      return {
        dryRun: false as const,
        action: isUpdate ? ("update" as const) : ("create" as const),
        assignment: {
          id: result.id,
          title: result.title,
          classId: result.classId,
          courseId: result.courseId,
          submissionMode: result.submissionMode,
          dueDate: result.dueDate,
        },
        testCases: input.testCases
          ? { count: input.testCases.length, totalPoints }
          : null,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ assignmentId: z.string(), dryRun: dryRunSchema }))
    .mutation(async ({ ctx, input }) => {
      requireGrant(ctx.session, "assignment", "delete");
      await requireAssignmentManageAccess(ctx, input.assignmentId);

      const assignment = await ctx.db.attachment.findUnique({
        where: { id: input.assignmentId },
        select: {
          id: true,
          title: true,
          _count: {
            select: {
              testCases: true,
              submissions: { where: { status: "SUBMITTED" } },
            },
          },
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found",
        });
      }

      const impact = {
        assignmentId: assignment.id,
        title: assignment.title,
        testCases: assignment._count.testCases,
        submittedSubmissions: assignment._count.submissions,
      };

      if (input.dryRun) return { dryRun: true as const, impact };

      await ctx.db.attachment.delete({ where: { id: input.assignmentId } });
      return { dryRun: false as const, deleted: true as const, impact };
    }),
});
