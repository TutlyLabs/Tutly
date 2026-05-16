import type {
  Attachment,
  EnrolledUsers,
  Point,
  submission,
  User,
} from "@tutly/db/browser";
import { createHmac } from "node:crypto";

import { z } from "zod";

import { enqueueTestRun } from "../lib/runner-client";
import {
  buildWorkspaceObjectKey,
  getArtifactDownloadUrl,
  getArtifactUploadUrl,
  workspaceArtifactBucket,
} from "../lib/workspace-artifacts";
import { defaultWorkspaceConfig } from "../lib/workspace-config";
import {
  getStudentEnrollmentForAssignment,
  requireAssignmentReadAccess,
  requireSubmissionReadAccess,
} from "../lib/workspace-access";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export type AssignmentDetails = {
  id: string;
  maxSubmissions: number;
  class: {
    courseId: string;
  };
};

export type MentorDetails = {
  mentor: {
    username: string;
  };
};

export type SubmissionWithDetails = {
  enrolledUser: EnrolledUsers & {
    user: User;
  };
  points: Array<Point>;
  assignment: Attachment;
  submissionCount?: number;
  submissionIndex?: number;
} & submission;

const artifactUploadInput = z.object({
  fileName: z.string().default("workspace.zip"),
  mimeType: z.string().default("application/zip"),
  sizeBytes: z.number().int().min(0).optional(),
  checksum: z.string().optional(),
  manifest: z.any().optional(),
});

function signWorkspaceToken(input: {
  assignmentId: string;
  submissionId: string;
  userId: string;
}) {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 8;
  const payload = {
    assignmentId: input.assignmentId,
    submissionId: input.submissionId,
    userId: input.userId,
    expiresAt,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const secret =
    process.env.WORKSPACE_AGENT_SECRET ??
    process.env.AUTH_SECRET ??
    "tutly-development-workspace-agent-secret";
  const signature = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export const submissionRouter = createTRPCRouter({
  createSubmission: protectedProcedure
    .input(
      z.object({
        assignmentDetails: z.object({
          id: z.string(),
          maxSubmissions: z.number(),
          class: z.object({
            courseId: z.string(),
          }),
        }),
        files: z.any(),
        mentorDetails: z.object({
          mentor: z.object({
            username: z.string(),
          }),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const submissions = await ctx.db.submission.findMany({
        where: {
          attachmentId: input.assignmentDetails.id,
          enrolledUser: {
            username: user.username,
          },
          status: "SUBMITTED",
        },
      });

      if (submissions.length >= input.assignmentDetails.maxSubmissions) {
        return { error: "Maximum submission limit reached" };
      }

      const enrolledUser = await ctx.db.enrolledUsers.findUnique({
        where: {
          username_courseId_mentorUsername: {
            username: user.username,
            courseId: input.assignmentDetails.class.courseId,
            mentorUsername: input.mentorDetails.mentor.username,
          },
        },
      });
      if (!enrolledUser) return { error: "Not enrolled" };

      const submission = await ctx.db.submission.create({
        data: {
          attachmentId: input.assignmentDetails.id,
          enrolledUserId: enrolledUser.id,
          // Prisma JSON input type isn't on the browser bundle.
          data: input.files as never,
          status: "SUBMITTED",
        },
      });

      await ctx.db.events.create({
        data: {
          eventCategory: "ASSIGNMENT_SUBMISSION",
          causedById: user.id,
          eventCategoryDataId: submission.id,
        },
      });

      const assignment = await ctx.db.attachment.findUnique({
        where: { id: input.assignmentDetails.id },
        select: { submissionMode: true },
      });

      if (assignment?.submissionMode === "SANDBOX") {
        const run = await ctx.db.submissionTestRun.create({
          data: {
            submissionId: submission.id,
            assignmentId: input.assignmentDetails.id,
            provider: "LOCAL",
            trigger: "auto-submit",
            status: "QUEUED",
            attempt: 1,
            triggeredByUserId: user.id,
            outputSummary: { queued: true } as never,
          },
        });

        await ctx.db.submissionReview.upsert({
          where: { submissionId: submission.id },
          create: {
            submissionId: submission.id,
            assignmentId: input.assignmentDetails.id,
            status: "NEEDS_REVIEW",
            testRunId: run.id,
          },
          update: {
            status: "NEEDS_REVIEW",
            testRunId: run.id,
          },
        });

        void enqueueTestRun(run.id);
      }

      return { success: true, data: submission };
    }),

  addOverallFeedback: protectedProcedure
    .input(
      z.object({
        submissionId: z.string(),
        feedback: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const submission = await ctx.db.submission.findUnique({
        where: {
          id: input.submissionId,
          status: "SUBMITTED",
        },
      });

      if (!submission) {
        return { error: "submission not found" };
      }

      const updatedSubmission = await ctx.db.submission.update({
        where: {
          id: input.submissionId,
          status: "SUBMITTED",
        },
        data: {
          overallFeedback: input.feedback,
        },
      });

      return { success: true, data: updatedSubmission };
    }),

  getAssignmentSubmissions: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;
      if (user.role === "STUDENT") {
        return { error: "Unauthorized" };
      }

      const assignment = await ctx.db.attachment.findUnique({
        where: {
          id: input.assignmentId,
        },
      });

      const submissions = await ctx.db.submission.findMany({
        where: {
          attachmentId: input.assignmentId,
          status: "SUBMITTED",
        },
        include: {
          enrolledUser: {
            include: {
              user: true,
            },
          },
          points: true,
          assignment: true,
          artifacts: {
            where: { isLatest: true },
            orderBy: { createdAt: "desc" },
          },
          testRuns: {
            orderBy: { createdAt: "desc" },
            take: 3,
          },
          review: true,
        },
        orderBy: {
          enrolledUser: {
            username: "asc",
          },
        },
      });

      let filteredSubmissions: Array<SubmissionWithDetails> = [];

      if (user.role === "INSTRUCTOR") {
        filteredSubmissions = submissions as Array<SubmissionWithDetails>;
      }

      if (user.role === "MENTOR") {
        filteredSubmissions = submissions.filter(
          (submission) =>
            submission.enrolledUser.mentorUsername === user.username,
        ) as Array<SubmissionWithDetails>;
      }

      if (assignment?.maxSubmissions && assignment.maxSubmissions > 1) {
        const submissionCount = await ctx.db.submission.groupBy({
          by: ["enrolledUserId"],
          where: {
            attachmentId: input.assignmentId,
            status: "SUBMITTED",
          },
          _count: {
            id: true,
          },
        });

        filteredSubmissions.forEach((submission) => {
          const submissionCountData = submissionCount.find(
            (data) => data.enrolledUserId === submission.enrolledUserId,
          );
          if (submissionCountData) {
            submission.submissionCount = submissionCountData._count.id;
          }
        });

        filteredSubmissions.forEach((submission) => {
          submission.submissionIndex = 1;
          if (submission.submissionCount && submission.submissionCount > 1) {
            const submissionIndex = submissions
              .filter((sub) => sub.enrolledUserId === submission.enrolledUserId)
              .findIndex((sub) => sub.id === submission.id);
            submission.submissionIndex =
              (submissionIndex >= 0 ? submissionIndex : 0) + 1;
          }
        });
      }

      return { success: true, data: filteredSubmissions };
    }),

  getAllAssignmentSubmissions: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;
    if (user.role === "STUDENT") {
      return { error: "Unauthorized" };
    }

    const submissions = await ctx.db.submission.findMany({
      where: {
        status: "SUBMITTED",
      },
      include: {
        enrolledUser: {
          include: {
            user: true,
          },
        },
        points: true,
        assignment: true,
        artifacts: {
          where: { isLatest: true },
          orderBy: { createdAt: "desc" },
        },
        testRuns: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
        review: true,
      },
      orderBy: {
        enrolledUser: {
          username: "asc",
        },
      },
    });

    let filteredSubmissions: Array<SubmissionWithDetails> = [];

    if (user.role === "INSTRUCTOR") {
      filteredSubmissions = submissions as Array<SubmissionWithDetails>;
    }

    if (user.role === "MENTOR") {
      filteredSubmissions = submissions.filter(
        (submission) =>
          submission.enrolledUser.mentorUsername === user.username,
      ) as Array<SubmissionWithDetails>;
    }

    const submissionsByAssignment = filteredSubmissions.reduce<
      Record<string, Array<SubmissionWithDetails>>
    >((acc, submission) => {
      const attachmentId = submission.attachmentId;
      acc[attachmentId] = acc[attachmentId] ?? [];
      acc[attachmentId].push(submission);
      return acc;
    }, {});

    for (const [attachmentId, assignmentSubmissions] of Object.entries(
      submissionsByAssignment,
    )) {
      const assignment = await ctx.db.attachment.findUnique({
        where: {
          id: attachmentId,
        },
      });

      if (assignment?.maxSubmissions && assignment.maxSubmissions > 1) {
        const submissionCount = await ctx.db.submission.groupBy({
          by: ["enrolledUserId"],
          where: {
            attachmentId: attachmentId,
            status: "SUBMITTED",
          },
          _count: {
            id: true,
          },
        });

        assignmentSubmissions.forEach((submission) => {
          const submissionCountData = submissionCount.find(
            (data) => data.enrolledUserId === submission.enrolledUserId,
          );
          if (submissionCountData) {
            submission.submissionCount = submissionCountData._count.id;
          }
        });

        assignmentSubmissions.forEach((submission) => {
          submission.submissionIndex = 1;
          if (submission.submissionCount && submission.submissionCount > 1) {
            const submissionIndex = assignmentSubmissions
              .filter((sub) => sub.enrolledUserId === submission.enrolledUserId)
              .findIndex((sub) => sub.id === submission.id);
            submission.submissionIndex =
              (submissionIndex >= 0 ? submissionIndex : 0) + 1;
          }
        });
      }
    }

    return { success: true, data: filteredSubmissions };
  }),

  getSubmissionById: protectedProcedure
    .input(
      z.object({
        submissionId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const submission = await ctx.db.submission.findUnique({
        where: {
          id: input.submissionId,
          status: "SUBMITTED",
        },
        include: {
          enrolledUser: true,
          points: true,
        },
      });

      if (!submission && input.submissionId) {
        return { error: "Submission not found" };
      }

      return { success: true, data: submission };
    }),

  deleteSubmission: protectedProcedure
    .input(
      z.object({
        submissionId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const hasAccess = user.role === "INSTRUCTOR" || user.role === "MENTOR";
      if (!hasAccess) {
        return { error: "Unauthorized" };
      }

      await ctx.db.submission.delete({
        where: {
          id: input.submissionId,
          status: "SUBMITTED",
        },
      });

      return { success: true };
    }),

  submitExternalLink: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string(),
        maxSubmissions: z.number(),
        externalLink: z.string(),
        courseId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      const submissions = await ctx.db.submission.findMany({
        where: {
          attachmentId: input.assignmentId,
          enrolledUser: {
            username: user.username,
          },
          status: "SUBMITTED",
        },
      });

      if (submissions.length >= input.maxSubmissions) {
        return { error: "Maximum submission limit reached" };
      }

      const mentorDetails = await ctx.db.enrolledUsers.findFirst({
        where: {
          username: user.username,
          courseId: input.courseId,
        },
        select: {
          mentor: {
            select: {
              username: true,
            },
          },
        },
      });

      if (!mentorDetails) {
        return { error: "Mentor not found" };
      }

      const mentorUsername = mentorDetails.mentor?.username ?? "";

      const enrolledUser = await ctx.db.enrolledUsers.findUnique({
        where: {
          username_courseId_mentorUsername: {
            username: user.username,
            courseId: input.courseId,
            mentorUsername: mentorUsername,
          },
        },
      });

      if (!enrolledUser) {
        return { error: "User not enrolled in the course" };
      }

      await ctx.db.submission.create({
        data: {
          enrolledUserId: enrolledUser.id,
          attachmentId: input.assignmentId,
          submissionLink: input.externalLink,
          status: "SUBMITTED",
        },
      });

      return { success: true };
    }),

  getSubmissionForPlayground: protectedProcedure
    .input(z.object({ submissionId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const currentUser = ctx.session.user;

        const submission = await ctx.db.submission.findUnique({
          where: { id: input.submissionId, status: "SUBMITTED" },
          include: {
            enrolledUser: true,
            points: true,
          },
        });

        if (!submission) {
          return { success: false, error: "Submission not found" };
        }

        // Check access permissions
        const isStudentAccess =
          currentUser.role === "STUDENT" &&
          submission.enrolledUser.username === currentUser.username;
        const isMentorAccess =
          currentUser.role === "MENTOR" &&
          submission.enrolledUser.mentorUsername === currentUser.username;
        const isInstructorAccess = currentUser.role === "INSTRUCTOR";

        if (!isStudentAccess && !isMentorAccess && !isInstructorAccess) {
          return { success: false, error: "Access denied" };
        }

        return {
          success: true,
          data: {
            submission,
            initialFiles: submission.data,
          },
        };
      } catch (error) {
        console.error("Error fetching submission for playground:", error);
        return {
          success: false,
          error: "Failed to fetch submission data",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    }),

  startWorkspace: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string(),
        provider: z.enum(["LOCAL", "SSH"]).default("LOCAL"),
        serviceConnectionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;
      const { assignment, enrollment } = await getStudentEnrollmentForAssignment(
        ctx,
        input.assignmentId,
      );

      if (input.serviceConnectionId) {
        const connection = await ctx.db.serviceConnection.findFirst({
          where: {
            id: input.serviceConnectionId,
            userId: user.id,
            status: "ACTIVE",
          },
        });
        if (!connection) return { error: "Active service connection not found" };
      }

      const submittedCount = await ctx.db.submission.count({
        where: {
          attachmentId: input.assignmentId,
          enrolledUserId: enrollment.id,
          status: "SUBMITTED",
        },
      });
      const maxSubmissions = assignment.maxSubmissions ?? 1;
      if (submittedCount >= maxSubmissions) {
        return { error: "Maximum submission limit reached" };
      }

      const workspaceSubmission =
        (await ctx.db.submission.findFirst({
          where: {
            attachmentId: input.assignmentId,
            enrolledUserId: enrollment.id,
            status: "IN_PROGRESS",
          },
          include: {
            artifacts: {
              where: { isLatest: true },
              orderBy: { createdAt: "desc" },
            },
          },
        })) ??
        (await ctx.db.submission.create({
          data: {
            attachmentId: input.assignmentId,
            enrolledUserId: enrollment.id,
            status: "IN_PROGRESS",
            data: {
              provider: input.provider,
              startedAt: new Date().toISOString(),
            } as never,
          },
          include: {
            artifacts: {
              where: { isLatest: true },
              orderBy: { createdAt: "desc" },
            },
          },
        }));

      const [config, testCases, starterArtifacts] = await Promise.all([
        ctx.db.assignmentConfig.findUnique({
          where: { assignmentId: input.assignmentId },
        }),
        ctx.db.assignmentTestCase.findMany({
          where: {
            assignmentId: input.assignmentId,
            visibility: "VISIBLE",
          },
          orderBy: { createdAt: "asc" },
        }),
        ctx.db.assignmentArtifact.findMany({
          where: {
            assignmentId: input.assignmentId,
            submissionId: null,
            isLatest: true,
            kind: { in: ["STARTER", "MIGRATION"] },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);
      const defaults = defaultWorkspaceConfig();

      return {
        success: true,
        data: {
          submission: workspaceSubmission,
          config: {
            ...defaults,
            ...(config ?? {}),
            previewPorts: config?.previewPorts?.length
              ? config.previewPorts
              : defaults.previewPorts,
            readonlyPaths: config?.readonlyPaths?.length
              ? config.readonlyPaths
              : defaults.readonlyPaths,
          },
          testCases,
          starterArtifacts,
          workspaceToken: signWorkspaceToken({
            assignmentId: input.assignmentId,
            submissionId: workspaceSubmission.id,
            userId: user.id,
          }),
        },
      };
    }),

  saveSnapshot: protectedProcedure
    .input(
      z.object({
        submissionId: z.string(),
        artifact: artifactUploadInput,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const submission = await requireSubmissionReadAccess(ctx, input.submissionId);
      if (submission.enrolledUser.username !== ctx.session.user.username) {
        return { error: "Only the enrolled student can save this workspace" };
      }
      const objectKey = buildWorkspaceObjectKey({
        assignmentId: submission.attachmentId,
        submissionId: submission.id,
        kind: "AUTOSAVE",
        fileName: input.artifact.fileName,
      });

      await ctx.db.assignmentArtifact.updateMany({
        where: {
          submissionId: submission.id,
          kind: "AUTOSAVE",
          isLatest: true,
        },
        data: { isLatest: false },
      });

      const artifact = await ctx.db.assignmentArtifact.create({
        data: {
          assignmentId: submission.attachmentId,
          submissionId: submission.id,
          kind: "AUTOSAVE",
          bucket: workspaceArtifactBucket,
          objectKey,
          fileName: input.artifact.fileName,
          mimeType: input.artifact.mimeType,
          sizeBytes:
            input.artifact.sizeBytes === undefined
              ? null
              : BigInt(input.artifact.sizeBytes),
          checksum: input.artifact.checksum ?? null,
          manifest: input.artifact.manifest ?? {},
          createdById: ctx.session.user.id,
        },
      });

      const uploadUrl = await getArtifactUploadUrl({
        objectKey,
        mimeType: input.artifact.mimeType,
        checksum: input.artifact.checksum,
      });

      return { success: true, data: { artifact, uploadUrl } };
    }),

  submitWorkspace: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string().optional(),
        submissionId: z.string().optional(),
        artifact: artifactUploadInput.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.assignmentId && !input.submissionId) {
        return { error: "assignmentId or submissionId is required" };
      }

      let workspaceSubmission = input.submissionId
        ? await requireSubmissionReadAccess(ctx, input.submissionId)
        : null;

      if (!workspaceSubmission && input.assignmentId) {
        const started = await getStudentEnrollmentForAssignment(ctx, input.assignmentId);
        const inProgress = await ctx.db.submission.findFirst({
          where: {
            attachmentId: input.assignmentId,
            enrolledUserId: started.enrollment.id,
            status: "IN_PROGRESS",
          },
          include: {
            enrolledUser: true,
            assignment: {
              include: {
                course: {
                  include: {
                    courseAdmins: {
                      select: { id: true },
                    },
                  },
                },
              },
            },
          },
        });
        workspaceSubmission =
          inProgress ??
          (await ctx.db.submission.create({
            data: {
              attachmentId: input.assignmentId,
              enrolledUserId: started.enrollment.id,
              status: "IN_PROGRESS",
            },
            include: {
              enrolledUser: true,
              assignment: {
                include: {
                  course: {
                    include: {
                      courseAdmins: {
                        select: { id: true },
                      },
                    },
                  },
                },
              },
            },
          }));
      }

      if (!workspaceSubmission) return { error: "Submission not found" };
      if (workspaceSubmission.enrolledUser.username !== ctx.session.user.username) {
        return { error: "Only the enrolled student can submit this workspace" };
      }

      const submittedCount = await ctx.db.submission.count({
        where: {
          attachmentId: workspaceSubmission.attachmentId,
          enrolledUserId: workspaceSubmission.enrolledUserId,
          status: "SUBMITTED",
        },
      });
      const maxSubmissions = workspaceSubmission.assignment.maxSubmissions ?? 1;
      if (submittedCount >= maxSubmissions && workspaceSubmission.status !== "SUBMITTED") {
        return { error: "Maximum submission limit reached" };
      }

      let upload:
        | {
            artifact: unknown;
            uploadUrl: string;
          }
        | null = null;

      if (input.artifact) {
        const objectKey = buildWorkspaceObjectKey({
          assignmentId: workspaceSubmission.attachmentId,
          submissionId: workspaceSubmission.id,
          kind: "SUBMISSION",
          fileName: input.artifact.fileName,
        });

        await ctx.db.assignmentArtifact.updateMany({
          where: {
            submissionId: workspaceSubmission.id,
            kind: "SUBMISSION",
            isLatest: true,
          },
          data: { isLatest: false },
        });

        const artifact = await ctx.db.assignmentArtifact.create({
          data: {
            assignmentId: workspaceSubmission.attachmentId,
            submissionId: workspaceSubmission.id,
            kind: "SUBMISSION",
            bucket: workspaceArtifactBucket,
            objectKey,
            fileName: input.artifact.fileName,
            mimeType: input.artifact.mimeType,
            sizeBytes:
              input.artifact.sizeBytes === undefined
                ? null
                : BigInt(input.artifact.sizeBytes),
            checksum: input.artifact.checksum ?? null,
            manifest: input.artifact.manifest ?? {},
            createdById: ctx.session.user.id,
          },
        });
        upload = {
          artifact,
          uploadUrl: await getArtifactUploadUrl({
            objectKey,
            mimeType: input.artifact.mimeType,
            checksum: input.artifact.checksum,
          }),
        };
      }

      const submitted = await ctx.db.submission.update({
        where: { id: workspaceSubmission.id },
        data: {
          status: "SUBMITTED",
          submissionDate: new Date(),
          data: {
            ...(typeof workspaceSubmission.data === "object" &&
            workspaceSubmission.data !== null &&
            !Array.isArray(workspaceSubmission.data)
              ? workspaceSubmission.data
              : {}),
            submittedAt: new Date().toISOString(),
          } as never,
        },
      });

      await ctx.db.submissionReview.upsert({
        where: { submissionId: submitted.id },
        create: {
          submissionId: submitted.id,
          assignmentId: submitted.attachmentId,
          status: "NEEDS_REVIEW",
        },
        update: {
          status: "NEEDS_REVIEW",
        },
      });

      const hiddenCount = await ctx.db.assignmentTestCase.count({
        where: {
          assignmentId: submitted.attachmentId,
          visibility: "HIDDEN",
        },
      });
      if (hiddenCount > 0) {
        await ctx.db.submissionTestRun.create({
          data: {
            submissionId: submitted.id,
            assignmentId: submitted.attachmentId,
            provider: "SSH",
            trigger: "official",
            status: "QUEUED",
            hiddenTotal: hiddenCount,
            outputSummary: {
              trustedRunnerRequired: true,
              reason: "Hidden tests stay server-side and are not sent to local workspaces.",
            } as never,
          },
        });
      }

      await ctx.db.events.create({
        data: {
          eventCategory: "ASSIGNMENT_SUBMISSION",
          causedById: ctx.session.user.id,
          eventCategoryDataId: submitted.id,
        },
      });

      return {
        success: true,
        data: {
          submission: submitted,
          upload,
          officialRunQueued: hiddenCount > 0,
        },
      };
    }),

  confirmWorkspaceArtifactUpload: protectedProcedure
    .input(
      z.object({
        artifactId: z.string(),
        checksum: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const artifact = await ctx.db.assignmentArtifact.findUnique({
        where: { id: input.artifactId },
        include: { submission: true },
      });

      if (!artifact) return { error: "Artifact not found" };
      if (artifact.submissionId) {
        await requireSubmissionReadAccess(ctx, artifact.submissionId);
      } else if (artifact.assignmentId) {
        await requireAssignmentReadAccess(ctx, artifact.assignmentId);
      }

      const updated = await ctx.db.assignmentArtifact.update({
        where: { id: artifact.id },
        data: {
          status: "STORED",
          uploadedAt: new Date(),
          checksum: input.checksum ?? artifact.checksum,
        },
      });

      return { success: true, data: updated };
    }),

  getWorkspaceArtifactDownloadUrl: protectedProcedure
    .input(z.object({ artifactId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const artifact = await ctx.db.assignmentArtifact.findUnique({
        where: { id: input.artifactId },
      });
      if (!artifact) return { error: "Artifact not found" };
      if (artifact.submissionId) {
        await requireSubmissionReadAccess(ctx, artifact.submissionId);
      } else if (artifact.assignmentId) {
        await requireAssignmentReadAccess(ctx, artifact.assignmentId);
      }

      const signedUrl = await getArtifactDownloadUrl({
        objectKey: artifact.objectKey,
      });

      return { success: true, data: { signedUrl } };
    }),
});
