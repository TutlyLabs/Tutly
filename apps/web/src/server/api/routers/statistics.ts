import type { Attendance, submission, User } from "@/lib/prisma";
import { z } from "zod";

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
      try {
        let assignments: Array<SubmissionWithPoints> | undefined;
        let noOfTotalMentees: number | undefined;
        if (currentUser.role === "MENTOR" || input.mentorUsername) {
          assignments = await ctx.db.submission.findMany({
            where: {
              enrolledUser: {
                mentorUsername: input.mentorUsername ?? currentUser.username,
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
              mentorUsername: input.mentorUsername ?? currentUser.username,
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
      } catch (e) {
        return { error: "Failed to fetch pichart data", details: String(e) };
      }
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
      try {
        let attendance: Array<AttendanceWithClass> = [];
        if (currentUser.role === "MENTOR" || input.mentorUsername) {
          attendance = await ctx.db.attendance.findMany({
            where: {
              user: {
                enrolledUsers: {
                  some: {
                    mentorUsername:
                      input.mentorUsername ?? currentUser.username,
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
        const getAllClasses = await ctx.db.class.findMany({
          where: {
            courseId: input.courseId,
          },
          select: {
            id: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        });
        const classes: Array<string> = [];
        const attendanceInEachClass: Array<number> = [];
        getAllClasses.forEach((classData) => {
          classes.push(classData.createdAt.toISOString().split("T")[0] ?? "");
          const tem = attendance.filter(
            (attendanceData) => attendanceData.classId === classData.id,
          );
          attendanceInEachClass.push(tem.length);
        });
        const linechartData = [];
        for (let i = 0; i < classes.length; i++) {
          linechartData.push({
            class: classes[i],
            attendees: attendanceInEachClass[i] ?? 0,
            absentees: input.menteesCount - (attendanceInEachClass[i] ?? 0),
          });
        }
        return linechartData;
      } catch (e) {
        return { error: "Failed to fetch linechart data", details: String(e) };
      }
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
      try {
        let submissionCount;
        if (currentUser.role === "MENTOR" || input.mentorUsername) {
          submissionCount = await ctx.db.attachment.findMany({
            where: {
              attachmentType: "ASSIGNMENT",
              courseId: input.courseId,
            },
            include: {
              submissions: {
                where: {
                  enrolledUser: {
                    mentorUsername:
                      input.mentorUsername ?? currentUser.username,
                  },
                  status: "SUBMITTED",
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          });
        } else if (currentUser.role === "INSTRUCTOR") {
          submissionCount = await ctx.db.attachment.findMany({
            where: {
              attachmentType: "ASSIGNMENT",
              courseId: input.courseId,
            },
            include: {
              submissions: {
                where: {
                  status: "SUBMITTED",
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          });
        }
        const assignments: Array<string> = [];
        const countForEachAssignment: Array<number> = [];
        submissionCount?.forEach((submission) => {
          assignments.push(submission.title);
          countForEachAssignment.push(submission.submissions.length);
        });
        const barchartData = [];
        for (let i = 0; i < assignments.length; i++) {
          barchartData.push({
            assignment: assignments[i],
            submissions: countForEachAssignment[i],
          });
        }
        return barchartData;
      } catch (e) {
        return { error: "Failed to fetch barchart data", details: String(e) };
      }
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
      try {
        let students: Array<User> | undefined;
        if (currentUser.role === "MENTOR" || input.mentorUsername) {
          students = await ctx.db.user.findMany({
            where: {
              enrolledUsers: {
                some: {
                  course: {
                    id: input.courseId,
                  },
                  mentorUsername: input.mentorUsername ?? currentUser.username,
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
      } catch (e) {
        return { error: "Failed to fetch barchart data", details: String(e) };
      }
    }),

  getAllMentors: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      try {
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
      } catch (e) {
        return { error: "Failed to fetch barchart data", details: String(e) };
      }
    }),

  studentBarchartData: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        studentUsername: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      try {
        let assignments = await ctx.db.submission.findMany({
          where: {
            enrolledUser: {
              username: input.studentUsername ?? currentUser.username,
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
      } catch (e) {
        return { error: "Failed to fetch barchart data", details: String(e) };
      }
    }),

  studentHeatmapData: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        studentUsername: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      try {
        const attendance = await ctx.db.attendance.findMany({
          where: {
            username: input.studentUsername ?? currentUser.username,
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
      } catch (e) {
        return { error: "Failed to fetch barchart data", details: String(e) };
      }
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
      try {
        const currentUser = ctx.session.user;
        const { courseId, mentorUsername, studentUsername } = input;

        // Check if current user has appropriate role
        if (
          currentUser.role !== "INSTRUCTOR" &&
          currentUser.role !== "MENTOR"
        ) {
          return {
            success: false,
            error: "Unauthorized access",
            redirectTo: "/",
          };
        }

        // Check if user is enrolled in the course
        const enrolledCourses = await ctx.db.enrolledUsers.findMany({
          where: {
            username: currentUser.username,
          },
        });

        if (!enrolledCourses.some((course) => course.courseId === courseId)) {
          return {
            success: false,
            error: "Course not found or not enrolled",
            redirectTo: "/",
          };
        }

        // Handle mentor-specific redirects
        if (currentUser.role === "MENTOR" && !mentorUsername) {
          return {
            success: false,
            error: "Mentor username required",
            redirectTo: `/tutor/statistics/${courseId}?mentor=${currentUser.username}`,
          };
        }

        if (
          currentUser.role === "MENTOR" &&
          mentorUsername !== currentUser.username
        ) {
          return {
            success: false,
            error: "Unauthorized mentor access",
            redirectTo: "/",
          };
        }

        return {
          success: true,
          data: {
            courseId,
            mentorUsername,
            studentUsername,
            userRole: currentUser.role,
            username: currentUser.username,
          },
        };
      } catch (error) {
        console.error("Error fetching statistics page data:", error);
        return {
          success: false,
          error: "Failed to fetch statistics page data",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    }),
});
