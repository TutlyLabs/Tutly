import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Attendance, submission } from "@tutly/db/browser";

import {
  requireCourseReadAccess,
  resolveTargetMentorUsername,
  resolveTargetUsername,
} from "../lib/authorization";
import { createTRPCRouter, protectedProcedure } from "../trpc";

type AttendanceWithClass = {
  class: {
    createdAt: Date;
  };
} & Attendance;

type SubmissionWithPoints = {
  points: Array<{ score: number }>;
} & submission;

export const statisticsRouter = createTRPCRouter({
  getPiechartData: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        mentorUsername: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      await requireCourseReadAccess(ctx, input.courseId);
      const requestedMentor = input.mentorUsername
        ? await resolveTargetMentorUsername(ctx, input.mentorUsername)
        : undefined;
      const targetMentor = requestedMentor ?? currentUser.username;
      let assignments: Array<SubmissionWithPoints> | undefined;
      let noOfTotalMentees: number | undefined;
      if (currentUser.role === "MENTOR" || requestedMentor) {
        assignments = await ctx.db.submission.findMany({
          where: {
            enrolledUser: {
              mentorUsername: targetMentor,
              courseId: input.courseId,
            },
            status: "SUBMITTED",
          },
          include: {
            points: true,
          },
        });
        noOfTotalMentees = await ctx.db.enrolledUsers.count({
          where: {
            mentorUsername: targetMentor,
            courseId: input.courseId,
          },
        });
      } else if (currentUser.role === "INSTRUCTOR") {
        assignments = await ctx.db.submission.findMany({
          where: {
            assignment: {
              courseId: input.courseId,
            },
            status: "SUBMITTED",
          },
          include: {
            points: true,
          },
        });
        noOfTotalMentees = await ctx.db.enrolledUsers.count({
          where: {
            courseId: input.courseId,
            user: {
              role: "STUDENT",
            },
          },
        });
      }
      let assignmentsWithPoints = 0,
        assignmentsWithoutPoints = 0;
      assignments?.forEach((assignment) => {
        if (assignment.points.length > 0) {
          assignmentsWithPoints += 1;
        } else {
          assignmentsWithoutPoints += 1;
        }
      });
      const noOfTotalAssignments = await ctx.db.attachment.count({
        where: {
          attachmentType: "ASSIGNMENT",
          courseId: input.courseId,
        },
      });
      const notSubmitted =
        noOfTotalAssignments * (noOfTotalMentees ?? 0) -
        assignmentsWithPoints -
        assignmentsWithoutPoints;

      return [assignmentsWithPoints, assignmentsWithoutPoints, notSubmitted];
    }),

  getLinechartData: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        menteesCount: z.number(),
        mentorUsername: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      await requireCourseReadAccess(ctx, input.courseId);
      const requestedMentor = input.mentorUsername
        ? await resolveTargetMentorUsername(ctx, input.mentorUsername)
        : undefined;
      const targetMentor = requestedMentor ?? currentUser.username;
      let attendance: Array<AttendanceWithClass> = [];
      if (currentUser.role === "MENTOR" || requestedMentor) {
        attendance = await ctx.db.attendance.findMany({
          where: {
            user: {
              enrolledUsers: {
                some: {
                  mentorUsername: targetMentor,
                },
              },
            },
            attended: true,
            class: {
              course: {
                id: input.courseId,
              },
            },
          },
          include: {
            class: {
              select: {
                createdAt: true,
              },
            },
          },
        });
      } else if (currentUser.role === "INSTRUCTOR") {
        attendance = await ctx.db.attendance.findMany({
          where: {
            attended: true,
            class: {
              courseId: input.courseId,
            },
          },
          include: {
            class: {
              select: {
                createdAt: true,
              },
            },
          },
        });
      }
      const eligibleWhere =
        currentUser.role === "MENTOR" || requestedMentor
          ? {
              courseId: input.courseId,
              mentorUsername: targetMentor,
            }
          : { courseId: input.courseId };

      const [getAllClasses, totalEligible] = await Promise.all([
        ctx.db.class.findMany({
          where: { courseId: input.courseId },
          select: { id: true, title: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
        ctx.db.enrolledUsers.count({ where: eligibleWhere }),
      ]);

      return getAllClasses.map((classData) => {
        const attendees = attendance.filter(
          (a) => a.classId === classData.id,
        ).length;
        return {
          class: classData.createdAt.toISOString().split("T")[0] ?? "",
          title: classData.title,
          attendees,
          absentees: Math.max(0, totalEligible - attendees),
          totalEligible,
        };
      });
    }),

  getBarchartData: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        mentorUsername: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      await requireCourseReadAccess(ctx, input.courseId);
      const requestedMentor = input.mentorUsername
        ? await resolveTargetMentorUsername(ctx, input.mentorUsername)
        : undefined;
      const targetMentor = requestedMentor ?? currentUser.username;
      const submissionWhere =
        currentUser.role === "MENTOR" || requestedMentor
          ? {
              enrolledUser: {
                mentorUsername: targetMentor,
              },
              status: "SUBMITTED" as const,
            }
          : { status: "SUBMITTED" as const };

      const eligibleStudentsWhere =
        currentUser.role === "MENTOR" || requestedMentor
          ? {
              courseId: input.courseId,
              mentorUsername: targetMentor,
            }
          : { courseId: input.courseId };

      const [assignments, totalEligible] = await Promise.all([
        ctx.db.attachment.findMany({
          where: {
            attachmentType: "ASSIGNMENT",
            courseId: input.courseId,
          },
          select: {
            id: true,
            title: true,
            dueDate: true,
            maxSubmissions: true,
            submissions: {
              where: submissionWhere,
              select: {
                id: true,
                points: { select: { id: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        }),
        ctx.db.enrolledUsers.count({ where: eligibleStudentsWhere }),
      ]);

      return assignments.map((a) => {
        const total = a.submissions.length;
        const evaluated = a.submissions.filter(
          (s) => s.points.length > 0,
        ).length;
        const pending = total - evaluated;
        const notSubmitted = Math.max(0, totalEligible - total);
        const overdue = a.dueDate
          ? new Date(a.dueDate as unknown as string).getTime() < Date.now()
          : false;
        return {
          assignment: a.title,
          submissions: total,
          evaluated,
          pending,
          notSubmitted,
          totalEligible,
          maxSubmissions: a.maxSubmissions,
          overdue,
          dueDate: a.dueDate ?? null,
        };
      });
    }),

  getAllMentees: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        mentorUsername: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      await requireCourseReadAccess(ctx, input.courseId);
      const requestedMentor = input.mentorUsername
        ? await resolveTargetMentorUsername(ctx, input.mentorUsername)
        : undefined;
      const targetMentor = requestedMentor ?? currentUser.username;
      type MenteeSelect = { course: true; enrolledUsers: true };
      let students:
        | Awaited<
            ReturnType<
              typeof ctx.db.user.findMany<{ include: MenteeSelect }>
            >
          >
        | undefined;
      if (currentUser.role === "MENTOR" || requestedMentor) {
        students = await ctx.db.user.findMany({
          where: {
            enrolledUsers: {
              some: {
                course: {
                  id: input.courseId,
                },
                mentorUsername: targetMentor,
              },
            },
            role: "STUDENT",
            organization: {
              id: currentUser.organization?.id,
            },
          },
          include: {
            course: true,
            enrolledUsers: true,
          },
        });
      } else if (currentUser.role === "INSTRUCTOR") {
        students = await ctx.db.user.findMany({
          where: {
            enrolledUsers: {
              some: {
                course: {
                  id: input.courseId,
                },
              },
            },
            role: "STUDENT",
            organization: {
              id: currentUser.organization?.id,
            },
          },
          include: {
            course: true,
            enrolledUsers: true,
          },
        });
      }

      return students ?? [];
    }),

  getAllMentors: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      await requireCourseReadAccess(ctx, input.courseId);
      const mentors = await ctx.db.user.findMany({
        where: {
          enrolledUsers: {
            some: {
              course: {
                id: input.courseId,
              },
            },
          },
          role: "MENTOR",
          organization: {
            id: currentUser.organization?.id,
          },
        },
        include: {
          course: true,
          enrolledUsers: true,
        },
      });

      return mentors;
    }),

  studentBarchartData: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        studentUsername: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireCourseReadAccess(ctx, input.courseId);
      const targetStudent = await resolveTargetUsername(
        ctx,
        input.studentUsername,
        input.courseId,
      );
      let assignments = await ctx.db.submission.findMany({
        where: {
          enrolledUser: {
            username: targetStudent,
          },
          assignment: {
            courseId: input.courseId,
          },
          status: "SUBMITTED",
        },
        include: {
          points: true,
        },
      });
      let totalPoints = 0;
      const tem = assignments;
      assignments = assignments.filter(
        (assignment) => assignment.points.length > 0,
      );
      const underReview = tem.length - assignments.length;
      assignments.forEach((assignment) => {
        assignment.points.forEach((point) => {
          totalPoints += point.score;
        });
      });
      const noOfTotalAssignments = await ctx.db.attachment.findMany({
        where: {
          attachmentType: "ASSIGNMENT",
          courseId: input.courseId,
        },
      });
      let totalAssignments = 0;
      noOfTotalAssignments.forEach((assignment) => {
        totalAssignments += assignment.maxSubmissions ?? 0;
      });
      return {
        evaluated: assignments.length,
        unreviewed: underReview,
        unsubmitted: totalAssignments - assignments.length - underReview,
        totalPoints: totalPoints,
      };
    }),

  studentHeatmapData: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        studentUsername: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireCourseReadAccess(ctx, input.courseId);
      const targetStudent = await resolveTargetUsername(
        ctx,
        input.studentUsername,
        input.courseId,
      );
      const attendance = await ctx.db.attendance.findMany({
        where: {
          username: targetStudent,
          AND: {
            class: {
              course: {
                id: input.courseId,
              },
            },
          },
        },
        select: {
          attendedDuration: true,
          class: {
            select: {
              id: true,
              title: true,
              createdAt: true,
            },
          },
        },
      });
      const attendanceDates: Array<string> = [];
      const attendanceDetails: Record<
        string,
        { duration: number | null; classId: string; title: string }
      > = {};
      attendance.forEach((attendanceData) => {
        const dateStr =
          attendanceData.class.createdAt.toISOString().split("T")[0] ?? "";
        attendanceDates.push(dateStr);
        attendanceDetails[dateStr] = {
          duration: attendanceData.attendedDuration,
          classId: attendanceData.class.id,
          title: attendanceData.class.title,
        };
      });

      const getAllClasses = await ctx.db.class.findMany({
        where: {
          courseId: input.courseId,
          Attendence: {
            some: {},
          },
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });
      const classes: Array<string> = [];
      const classDetails: Record<string, { classId: string; title: string }> =
        {};
      getAllClasses.forEach((classData) => {
        const dateStr = classData.createdAt.toISOString().split("T")[0] ?? "";
        classes.push(dateStr);
        classDetails[dateStr] = {
          classId: classData.id,
          title: classData.title,
        };
      });

      // Get all classes without attendance uploaded
      const classesWithoutAttendance = await ctx.db.class.findMany({
        where: {
          courseId: input.courseId,
          Attendence: {
            none: {},
          },
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });
      const classesNoAttendance: Array<string> = [];
      classesWithoutAttendance.forEach((classData) => {
        const dateStr = classData.createdAt.toISOString().split("T")[0] ?? "";
        classesNoAttendance.push(dateStr);
        classDetails[dateStr] = {
          classId: classData.id,
          title: classData.title,
        };
      });

      return {
        classes,
        attendanceDates,
        classesNoAttendance,
        attendanceDetails,
        classDetails,
      };
    }),

  getStatisticsPageData: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        mentorUsername: z.string().optional(),
        studentUsername: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      const { courseId, studentUsername } = input;

      if (currentUser.role !== "INSTRUCTOR" && currentUser.role !== "MENTOR") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Statistics are only available to instructors and mentors",
        });
      }

      const enrollment = await ctx.db.enrolledUsers.findFirst({
        where: { username: currentUser.username, courseId },
        select: { id: true },
      });
      if (!enrollment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      }

      // A mentor may only ever see their own cohort; default the scope to them
      // rather than bouncing the browser through a redirect.
      if (
        currentUser.role === "MENTOR" &&
        input.mentorUsername &&
        input.mentorUsername !== currentUser.username
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only view your own statistics",
        });
      }
      const mentorUsername =
        currentUser.role === "MENTOR"
          ? currentUser.username
          : input.mentorUsername;

      return {
        courseId,
        mentorUsername,
        studentUsername,
        userRole: currentUser.role,
        username: currentUser.username,
      };
    }),
});
