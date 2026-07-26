import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@tutly/db";
import { readSandpackTemplate, readSubmission } from "@tutly/storage";

import type { SandpackTemplate } from "../lib/template-policy";
import {
  requireAssignmentManageAccess,
  requireAssignmentReadAccess,
  requireCourseReadAccess,
  resolveTargetUsername,
} from "../lib/authorization";
import { locatorFrom, locatorSelect } from "../lib/storage-locator";
import { mergeForAudience } from "../lib/template-policy";
import {
  buildWorkspaceObjectKey,
  getArtifactUploadUrl,
  workspaceArtifactBucket,
} from "../lib/workspace-artifacts";
import { defaultWorkspaceConfig } from "../lib/workspace-config";
import { createTRPCRouter, protectedProcedure } from "../trpc";

async function loadSandboxTemplateRaw(
  assignmentId: string,
): Promise<string | null> {
  const row = await db.attachment.findUnique({
    where: { id: assignmentId },
    select: locatorSelect,
  });
  if (!row) return null;
  const parsed = await readSandpackTemplate(locatorFrom(row));
  return parsed
    ? Buffer.from(JSON.stringify(parsed), "utf-8").toString("base64")
    : null;
}

export type AssignmentDetails = {
  sortedAssignments: Array<{
    id: string;
    enrolledUser: {
      username: string;
    };
  }>;
  notSubmittedMentees: Array<{
    username: string;
  }>;
  isCourseAdmin: boolean;
};

const workspaceTestCaseInput = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  visibility: z.enum(["VISIBLE", "HIDDEN"]).default("VISIBLE"),
  command: z.string().min(1),
  points: z.number().int().min(0).default(1),
  timeoutMs: z.number().int().min(1000).default(120000),
  metadata: z.any().optional(),
  artifactId: z.string().nullable().optional(),
});

const workspaceArtifactUploadInput = z.object({
  kind: z.enum(["STARTER", "MIGRATION"]).default("STARTER"),
  fileName: z.string().default("starter.zip"),
  mimeType: z.string().default("application/zip"),
  sizeBytes: z.number().int().min(0).optional(),
  checksum: z.string().optional(),
  manifest: z.any().optional(),
});

export const assignmentsRouter = createTRPCRouter({
  getAssignmentDetailsForSubmission: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireAssignmentReadAccess(ctx, input.id);
      const currentUser = ctx.session.user;

      const assignment = await ctx.db.attachment.findUnique({
        where: {
          id: input.id,
        },
        include: {
          class: {
            include: {
              course: true,
            },
          },
          submissions: {
            where: {
              enrolledUser: {
                user: {
                  id: currentUser.id,
                },
              },
              status: "SUBMITTED",
            },
            include: {
              enrolledUser: {
                include: {
                  submission: true,
                },
              },
              points: true,
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

      if (!assignment.class?.courseId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      }

      const mentorDetails = await ctx.db.enrolledUsers.findFirst({
        where: {
          username: currentUser.username,
          courseId: assignment.class.courseId,
        },
        select: {
          mentor: {
            select: {
              username: true,
            },
          },
        },
      });

      return {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          link: assignment.link,
          details: assignment.details,
          detailsJson: assignment.detailsJson,
          sandboxTemplate: await loadSandboxTemplateRaw(assignment.id),
          class: {
            id: assignment.class.id,
            title: assignment.class.title,
            courseId: assignment.class.courseId,
            course: {
              id: assignment.class.course?.id,
              title: assignment.class.course?.title,
            },
          },
          submissions: assignment.submissions.map((submission) => {
            return { id: submission.id };
          }),
          maxSubmissions: assignment.maxSubmissions,
        },
        mentorDetails,
      };
    }),

  getAssignmentsPageData: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    const coursesData = await ctx.db.course.findMany({
      where: {
        enrolledUsers: {
          some: {
            username: currentUser.username,
          },
        },
      },
      include: {
        classes: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            classes: true,
          },
        },
        courseAdmins: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    // Sort classes by creation date
    coursesData.forEach((course) => {
      course.classes.sort((a, b) => {
        return Number(a.createdAt) - Number(b.createdAt);
      });
    });

    const publishedCourses = coursesData.filter((course) => course.isPublished);
    const courses =
      currentUser.role === "INSTRUCTOR" ? coursesData : publishedCourses;

    const isInstructorScope = currentUser.role !== "STUDENT";

    // Mentors only see their mentees' submissions, matching the detail page.
    const submissionWhere =
      currentUser.role === "STUDENT"
        ? {
            status: "SUBMITTED" as const,
            enrolledUser: { username: currentUser.username },
          }
        : currentUser.role === "MENTOR"
          ? {
              status: "SUBMITTED" as const,
              enrolledUser: { mentorUsername: currentUser.username },
            }
          : { status: "SUBMITTED" as const };
    const submissionSelect = isInstructorScope
      ? {
          id: true,
          points: { select: { id: true } },
        }
      : {
          id: true,
          submissionLink: true,
          submissionDate: true,
          overallFeedback: true,
          points: {
            select: { id: true, score: true, category: true },
          },
        };

    const assignments = await ctx.db.course.findMany({
      where: {
        enrolledUsers: {
          some: {
            username: currentUser.username,
          },
        },
      },
      select: {
        id: true,
        classes: {
          select: {
            attachments: {
              where: {
                attachmentType: "ASSIGNMENT",
              },
              include: {
                class: true,
                submissions: {
                  where: submissionWhere,
                  select: submissionSelect,
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    // Course-scoped assignments without a class link (orphans).
    const courseIds = courses.map((c) => c.id);
    const orphanAttachments =
      courseIds.length > 0
        ? await ctx.db.attachment.findMany({
            where: {
              attachmentType: "ASSIGNMENT",
              classId: null,
              courseId: { in: courseIds },
            },
            include: {
              class: true,
              submissions: {
                where: submissionWhere,
                select: submissionSelect,
              },
            },
          })
        : [];

    // Inject orphans into their course as a synthetic class entry so the
    // existing UI shape stays compatible.
    const orphansByCourse = new Map<string, typeof orphanAttachments>();
    orphanAttachments.forEach((a) => {
      if (!a.courseId) return;
      const list = orphansByCourse.get(a.courseId) ?? [];
      list.push(a);
      orphansByCourse.set(a.courseId, list);
    });

    const assignmentsWithOrphans = assignments.map((course) => {
      const orphans = orphansByCourse.get(course.id) ?? [];
      if (orphans.length === 0) return course;
      return {
        ...course,
        classes: [...course.classes, { attachments: orphans }],
      };
    });

    return {
      courses,
      assignments: assignmentsWithOrphans,
    };
  }),

  getAssignmentDetailData: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string(),
        username: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        selectedMentor: z.string().optional(),
        searchQuery: z.string().default(""),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireAssignmentReadAccess(ctx, input.assignmentId);
      const currentUser = ctx.session.user;
      const {
        assignmentId,
        username,
        page,
        limit,
        selectedMentor,
        searchQuery,
      } = input;
      const skip = (page - 1) * limit;

      const baseInclude = {
        class: {
          select: {
            id: true,
            course: {
              select: {
                id: true,
                title: true,
                createdById: true,
              },
            },
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            createdById: true,
          },
        },
      };

      let assignmentData: any = null;
      let totalCount = 0;

      if (currentUser.role === "INSTRUCTOR") {
        const [rawAssignmentData, countResult] = await Promise.all([
          ctx.db.attachment.findUnique({
            where: { id: assignmentId },
            include: {
              ...baseInclude,
              submissions: {
                where: {
                  status: "SUBMITTED",
                  AND: [
                    selectedMentor && selectedMentor !== "all"
                      ? {
                          enrolledUser: {
                            mentorUsername: selectedMentor,
                          },
                        }
                      : {},
                    searchQuery
                      ? {
                          enrolledUser: {
                            username: {
                              contains: searchQuery,
                              mode: "insensitive",
                            },
                          },
                        }
                      : {},
                    username
                      ? {
                          enrolledUser: {
                            username: username,
                          },
                        }
                      : {},
                  ],
                },
                take: limit,
                skip,
                orderBy: { submissionDate: "desc" },
                include: {
                  enrolledUser: {
                    select: {
                      username: true,
                      mentorUsername: true,
                    },
                  },
                  points: {
                    select: {
                      category: true,
                      score: true,
                    },
                  },
                },
              },
              course: {
                select: {
                  id: true,
                  title: true,
                  createdById: true,
                  classes: true,
                  enrolledUsers: {
                    where: {
                      user: {
                        organizationId: currentUser.organizationId,
                      },
                    },
                    select: {
                      username: true,
                      mentorUsername: true,
                    },
                  },
                },
              },
            },
          }),
          ctx.db.submission.count({
            where: {
              attachmentId: assignmentId,
              status: "SUBMITTED",
              AND: [
                selectedMentor && selectedMentor !== "all"
                  ? {
                      enrolledUser: {
                        mentorUsername: selectedMentor,
                      },
                    }
                  : {},
                searchQuery
                  ? {
                      enrolledUser: {
                        username: {
                          contains: searchQuery,
                          mode: "insensitive",
                        },
                      },
                    }
                  : {},
                username
                  ? {
                      enrolledUser: {
                        username: username,
                      },
                    }
                  : {},
              ],
            },
          }),
        ]);

        assignmentData = rawAssignmentData;
        totalCount = countResult;
      } else if (currentUser.role === "MENTOR") {
        const [rawAssignmentData, countResult] = await Promise.all([
          ctx.db.attachment.findUnique({
            where: { id: assignmentId },
            include: {
              ...baseInclude,
              submissions: {
                where: {
                  status: "SUBMITTED",
                  AND: [
                    {
                      enrolledUser: {
                        mentorUsername: currentUser.username,
                      },
                    },
                    username
                      ? {
                          enrolledUser: {
                            username: username,
                          },
                        }
                      : {},
                    searchQuery
                      ? {
                          enrolledUser: {
                            username: {
                              contains: searchQuery,
                              mode: "insensitive",
                            },
                          },
                        }
                      : {},
                  ],
                },
                take: limit,
                skip,
                orderBy: { submissionDate: "desc" },
                include: {
                  enrolledUser: {
                    select: {
                      username: true,
                      mentorUsername: true,
                    },
                  },
                  points: {
                    select: {
                      category: true,
                      score: true,
                    },
                  },
                },
              },
              course: {
                select: {
                  id: true,
                  title: true,
                  createdById: true,
                  enrolledUsers: {
                    where: {
                      mentorUsername: currentUser.username,
                    },
                    select: {
                      username: true,
                      mentorUsername: true,
                    },
                  },
                },
              },
            },
          }),
          ctx.db.submission.count({
            where: {
              attachmentId: assignmentId,
              status: "SUBMITTED",
              AND: [
                {
                  enrolledUser: {
                    mentorUsername: currentUser.username,
                  },
                },
                username
                  ? {
                      enrolledUser: {
                        username: username,
                      },
                    }
                  : {},
                searchQuery
                  ? {
                      enrolledUser: {
                        username: {
                          contains: searchQuery,
                          mode: "insensitive",
                        },
                      },
                    }
                  : {},
              ],
            },
          }),
        ]);

        assignmentData = rawAssignmentData;
        totalCount = countResult;
      } else {
        // STUDENT role
        assignmentData = await ctx.db.attachment.findUnique({
          where: { id: assignmentId },
          include: {
            ...baseInclude,
            submissions: {
              where: {
                status: "SUBMITTED",
                enrolledUser: {
                  user: {
                    id: currentUser.id,
                  },
                },
              },
              include: {
                enrolledUser: {
                  select: {
                    username: true,
                    mentorUsername: true,
                  },
                },
                points: {
                  select: {
                    category: true,
                    score: true,
                  },
                },
              },
            },
          },
        });
      }

      if (!assignmentData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found",
        });
      }

      const notSubmittedMentees =
        assignmentData.course?.enrolledUsers?.filter(
          (enrolled: { username: string; mentorUsername: string | null }) =>
            !assignmentData.submissions?.some(
              (submission: { enrolledUser: { username: string } }) =>
                submission.enrolledUser.username === enrolled.username,
            ),
        ) ?? [];

      const sortedAssignments = [...(assignmentData.submissions ?? [])].sort(
        (
          a: { enrolledUser: { username: string } },
          b: { enrolledUser: { username: string } },
        ) => a.enrolledUser.username.localeCompare(b.enrolledUser.username),
      );

      const isCourseAdmin =
        currentUser.role === "INSTRUCTOR"
          ? currentUser.id === assignmentData.course?.createdById
          : currentUser.adminForCourses.some(
              (course: { id: string }) =>
                course.id === assignmentData.course?.id,
            );

      const totalPages = Math.ceil(totalCount / limit);

      const mentors = assignmentData?.course?.enrolledUsers
        ? Array.from(
            new Set(
              assignmentData.course.enrolledUsers
                .map(
                  (user: { mentorUsername: string | null }) =>
                    user.mentorUsername,
                )
                .filter(Boolean),
            ),
          )
        : [];

      return {
        assignment: assignmentData,
        assignments: sortedAssignments,
        notSubmittedMentees,
        isCourseAdmin,
        mentors: mentors as Array<string>,
        pagination: {
          currentPage: page,
          totalPages,
          pageSize: limit,
        },
      };
    }),

  getAssignmentEvaluateData: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string(),
        submissionId: z.string().optional(),
        username: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role === "STUDENT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Students cannot access evaluation page",
        });
      }
      await requireAssignmentReadAccess(ctx, input.assignmentId);
      const currentUser = ctx.session.user;
      const { assignmentId, submissionId, username } = input;

      const assignment = await ctx.db.attachment.findUnique({
        where: {
          id: assignmentId,
        },
        include: {
          class: {
            include: {
              course: true,
            },
          },
        },
      });

      const assignmenttemp = await ctx.db.attachment.findUnique({
        where: {
          id: assignmentId,
        },
      });

      const submissions = await ctx.db.submission.findMany({
        where: {
          attachmentId: assignmentId,
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
            take: 5,
          },
          review: true,
        },
        orderBy: {
          enrolledUser: {
            username: "asc",
          },
        },
      });

      let filteredSubmissions: Array<any> = [];

      if (currentUser.role === "INSTRUCTOR") {
        filteredSubmissions = submissions;
      }

      if (currentUser.role === "MENTOR") {
        filteredSubmissions = submissions.filter(
          (submission) =>
            submission.enrolledUser.mentorUsername === currentUser.username,
        );
      }

      if (assignmenttemp?.maxSubmissions && assignmenttemp.maxSubmissions > 1) {
        const submissionCount = await ctx.db.submission.groupBy({
          by: ["enrolledUserId"],
          where: {
            attachmentId: assignmentId,
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
            const submissionIndex =
              submissions
                .filter(
                  (sub) => sub.enrolledUserId === submission.enrolledUserId,
                )
                .findIndex((sub) => sub.id === submission.id) || 0;
            submission.submissionIndex = submissionIndex + 1;
          }
        });
      }

      if (username) {
        filteredSubmissions = filteredSubmissions.filter(
          (submission) => submission?.enrolledUser.username === username,
        );
      }

      const submission = filteredSubmissions.find(
        (submission) => submission?.id === submissionId,
      );
      let hydratedSubmission = submission;
      // Stored as a JSON string, but the evaluate payload serves the merged
      // template object so the client renders it without a second read.
      type MergedAssignment = Partial<
        Omit<NonNullable<typeof assignment>, "sandboxTemplate">
      > & { sandboxTemplate: SandpackTemplate };
      let assignmentWithTemplate: typeof assignment | MergedAssignment =
        assignment;

      const submissionMode = assignment?.submissionMode;
      const isSandboxMode =
        submissionMode !== "WORKSPACE" && submissionMode !== "EXTERNAL_LINK";

      if (isSandboxMode) {
        const locRow = await ctx.db.attachment.findUnique({
          where: { id: assignmentId },
          select: locatorSelect,
        });
        const locator = locRow ? locatorFrom(locRow) : null;

        if (locator) {
          const sandboxTemplate = await readSandpackTemplate(locator);
          const submissionFiles =
            submission && submissionId
              ? await readSubmission(locator, submissionId)
              : null;

          if (sandboxTemplate && typeof sandboxTemplate === "object") {
            const mergedTemplate = mergeForAudience(
              sandboxTemplate as SandpackTemplate,
              submissionFiles,
              "instructor",
            );
            assignmentWithTemplate = {
              ...assignment,
              sandboxTemplate: mergedTemplate,
            };
            if (submission) {
              hydratedSubmission = {
                ...submission,
                data: mergedTemplate.files ?? submission.data,
              };
            }
          } else if (submission && submissionFiles) {
            hydratedSubmission = { ...submission, data: submissionFiles };
          }
        }
      }

      return {
        assignment: assignmentWithTemplate,
        submissions: filteredSubmissions,
        submission: hydratedSubmission,
      };
    }),

  getTutorStudentAssignmentsData: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check if current user is a student (should redirect)
      if (ctx.session.user.role === "STUDENT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Students cannot access this page",
        });
      }
      // `userId` is a username here; a mentor may only target their own mentees.
      const userId = await resolveTargetUsername(ctx, input.userId);
      const currentUser = ctx.session.user;

      // Fetch student profile
      const student = await ctx.db.user.findUnique({
        where: { username: userId },
        select: {
          username: true,
          name: true,
          image: true,
          email: true,
          enrolledUsers: {
            select: {
              courseId: true,
              mentorUsername: true,
            },
          },
        },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      // Fetch simple courses for the user
      const courses = await ctx.db.course.findMany({
        where: {
          enrolledUsers: {
            some: {
              username: userId,
            },
          },
        },
        select: {
          id: true,
          title: true,
        },
      });

      // Fetch courses with assignments based on role
      const coursesWithAssignments = await ctx.db.course.findMany({
        where: {
          id: {
            in: courses.map((course) => course.id),
          },
          ...(currentUser.role === "MENTOR" && {
            classes: {
              some: {
                attachments: {
                  some: {
                    submissions: {
                      some: {
                        status: "SUBMITTED",
                        enrolledUser: {
                          mentorUsername: currentUser.username,
                        },
                      },
                    },
                  },
                },
              },
            },
          }),
        },
        select: {
          id: true,
          title: true,
          image: true,
          startDate: true,
          endDate: true,
          isPublished: true,
          createdAt: true,
          updatedAt: true,
          createdById: true,
          classes: {
            select: {
              id: true,
              createdAt: true,
              attachments: {
                where: {
                  attachmentType: "ASSIGNMENT",
                  ...(currentUser.role === "MENTOR" && {
                    submissions: {
                      some: {
                        status: "SUBMITTED",
                        enrolledUser: {
                          mentorUsername: currentUser.username,
                        },
                      },
                    },
                  }),
                },
                select: {
                  id: true,
                  title: true,
                  submissionMode: true,
                  dueDate: true,
                  class: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                  submissions: {
                    where: {
                      status: "SUBMITTED",
                      enrolledUser: {
                        user: {
                          username: userId,
                        },
                      },
                      ...(currentUser.role === "MENTOR" && {
                        enrolledUser: {
                          mentorUsername: currentUser.username,
                        },
                      }),
                    },
                    select: {
                      id: true,
                      submissionDate: true,
                      points: {
                        select: {
                          id: true,
                          score: true,
                        },
                      },
                      enrolledUser: {
                        select: {
                          mentorUsername: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      // Sort assignments
      const sortedAssignments = coursesWithAssignments.map((course) => ({
        ...course,
        classes: course.classes
          .map((cls) => ({
            ...cls,
            attachments: cls.attachments.sort((a, b) =>
              a.title.localeCompare(b.title),
            ),
          }))
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          ),
      }));

      return {
        courses,
        sortedAssignments,
        userId,
        student,
      };
    }),

  getCourseStudentStats: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role === "STUDENT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Students cannot access course stats",
        });
      }
      await requireCourseReadAccess(ctx, input.courseId);
      const currentUser = ctx.session.user;

      const totalAssignments = await ctx.db.attachment.count({
        where: {
          attachmentType: "ASSIGNMENT",
          OR: [
            { courseId: input.courseId },
            { class: { courseId: input.courseId } },
          ],
        },
      });

      const enrolledUserFilter =
        currentUser.role === "MENTOR"
          ? {
              courseId: input.courseId,
              mentorUsername: currentUser.username,
            }
          : { courseId: input.courseId };

      const submissions = await ctx.db.submission.findMany({
        where: {
          status: "SUBMITTED",
          enrolledUser: enrolledUserFilter,
        },
        select: {
          id: true,
          enrolledUser: { select: { username: true } },
          points: { select: { id: true, category: true } },
          attachmentId: true,
          testRuns: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { status: true },
          },
        },
      });

      const byUser = new Map<
        string,
        {
          submitted: Set<string>;
          evaluated: Set<string>;
          testsPassed: Set<string>;
          testsFailed: Set<string>;
        }
      >();
      submissions.forEach((s) => {
        const u = s.enrolledUser.username;
        const cur = byUser.get(u) ?? {
          submitted: new Set<string>(),
          evaluated: new Set<string>(),
          testsPassed: new Set<string>(),
          testsFailed: new Set<string>(),
        };
        cur.submitted.add(s.attachmentId);
        if (s.points.length > 0) cur.evaluated.add(s.attachmentId);
        const latestRun = s.testRuns[0]?.status;
        if (latestRun === "PASSED") cur.testsPassed.add(s.attachmentId);
        if (latestRun === "FAILED" || latestRun === "ERROR")
          cur.testsFailed.add(s.attachmentId);
        byUser.set(u, cur);
      });

      const stats: Record<
        string,
        {
          submitted: number;
          evaluated: number;
          testsPassed: number;
          testsFailed: number;
        }
      > = {};
      byUser.forEach((v, k) => {
        stats[k] = {
          submitted: v.submitted.size,
          evaluated: v.evaluated.size,
          testsPassed: v.testsPassed.size,
          testsFailed: v.testsFailed.size,
        };
      });

      return {
        totalAssignments,
        stats,
      };
    }),

  getAssignmentsDashboardData: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    // Check if current user is a student (should redirect)
    if (currentUser.role === "STUDENT") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Students cannot access this page",
      });
    }

    // Fetch students with complex includes
    const students = await ctx.db.user.findMany({
      where: {
        role: "STUDENT",
        organizationId: currentUser.organizationId,
        ...(currentUser.role === "MENTOR" && {
          enrolledUsers: {
            some: {
              mentorUsername: currentUser.username,
            },
          },
        }),
      },
      include: {
        course: true,
        enrolledUsers: true,
      },
    });

    // Fetch courses with complex includes
    const courses = await ctx.db.course.findMany({
      where: {
        ...(currentUser.role === "MENTOR"
          ? {
              enrolledUsers: {
                some: {
                  mentorUsername: currentUser.username,
                },
              },
            }
          : {
              enrolledUsers: {
                some: {
                  username: currentUser.username,
                },
              },
            }),
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        classes: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            classes: true,
          },
        },
        courseAdmins: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return {
      students,
      courses,
      currentUser,
    };
  }),

  updateWorkspaceConfig: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string(),
        framework: z.string().optional(),
        setupCommand: z.string().nullable().optional(),
        devCommand: z.string().nullable().optional(),
        testCommand: z.string().nullable().optional(),
        previewPorts: z.array(z.number().int().min(1).max(65535)).optional(),
        readonlyPaths: z.array(z.string()).optional(),
        grading: z.any().optional(),
        publicTestMetadata: z.any().optional(),
        defaultProvider: z.enum(["LOCAL", "SSH"]).optional(),
        testCases: z.array(workspaceTestCaseInput).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAssignmentManageAccess(ctx, input.assignmentId);
      const defaults = defaultWorkspaceConfig();

      const config = await ctx.db.assignmentConfig.upsert({
        where: { assignmentId: input.assignmentId },
        create: {
          assignmentId: input.assignmentId,
          framework: input.framework ?? defaults.framework,
          setupCommand: input.setupCommand ?? defaults.setupCommand,
          devCommand: input.devCommand ?? defaults.devCommand,
          testCommand: input.testCommand ?? defaults.testCommand,
          previewPorts: input.previewPorts ?? defaults.previewPorts,
          readonlyPaths: input.readonlyPaths ?? defaults.readonlyPaths,
          grading: (input.grading ?? defaults.grading) as never,
          publicTestMetadata: (input.publicTestMetadata ??
            defaults.publicTestMetadata) as never,
          defaultProvider: input.defaultProvider ?? defaults.defaultProvider,
        },
        update: {
          framework: input.framework,
          setupCommand: input.setupCommand,
          devCommand: input.devCommand,
          testCommand: input.testCommand,
          previewPorts: input.previewPorts,
          readonlyPaths: input.readonlyPaths,
          grading:
            input.grading === undefined ? undefined : (input.grading as never),
          publicTestMetadata:
            input.publicTestMetadata === undefined
              ? undefined
              : (input.publicTestMetadata as never),
          defaultProvider: input.defaultProvider,
        },
      });

      await ctx.db.attachment.update({
        where: { id: input.assignmentId },
        data: { submissionMode: "WORKSPACE" },
      });

      if (input.testCases) {
        await ctx.db.assignmentTestCase.deleteMany({
          where: { assignmentId: input.assignmentId },
        });
        if (input.testCases.length > 0) {
          await ctx.db.assignmentTestCase.createMany({
            data: input.testCases.map((testCase) => ({
              assignmentId: input.assignmentId,
              title: testCase.title,
              visibility: testCase.visibility,
              command: testCase.command,
              points: testCase.points,
              timeoutMs: testCase.timeoutMs,
              metadata: testCase.metadata ?? {},
              artifactId: testCase.artifactId ?? null,
            })),
          });
        }
      }

      const testCases = await ctx.db.assignmentTestCase.findMany({
        where: { assignmentId: input.assignmentId },
        orderBy: [{ visibility: "asc" }, { createdAt: "asc" }],
      });

      return {
        config,
        testCases,
      };
    }),

  createWorkspaceStarterUpload: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string(),
        artifact: workspaceArtifactUploadInput,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAssignmentManageAccess(ctx, input.assignmentId);
      const objectKey = buildWorkspaceObjectKey({
        assignmentId: input.assignmentId,
        kind: input.artifact.kind,
        fileName: input.artifact.fileName,
      });

      await ctx.db.assignmentArtifact.updateMany({
        where: {
          assignmentId: input.assignmentId,
          submissionId: null,
          kind: input.artifact.kind,
          isLatest: true,
        },
        data: { isLatest: false },
      });

      const artifact = await ctx.db.assignmentArtifact.create({
        data: {
          assignmentId: input.assignmentId,
          kind: input.artifact.kind,
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

      return { artifact, uploadUrl };
    }),
});
