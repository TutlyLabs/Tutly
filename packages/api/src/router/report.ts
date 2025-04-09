import { Role } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export interface ReportData {
  username: string;
  name: string | null;
  submissionLength: number;
  assignmentLength: number;
  score: number;
  submissionEvaluatedLength: number;
  attendance: string;
  mentorUsername: string | null;
}

export const reportRouter = createTRPCRouter({
  generateReport: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/report/generate",
        tags: ["report"],
        summary: "Generate course report",
        description:
          "Generates a comprehensive report for a course including student submissions, assignments, and attendance",
      },
    })
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      if (currentUser.role !== "INSTRUCTOR" && currentUser.role !== "MENTOR") {
        return { error: "You are not authorized to generate report" };
      }

      // First, get the courses the current user is enrolled in
      const enrolledCourses = await ctx.db.enrolledUsers.findMany({
        where: {
          username: currentUser.username,
          courseId: {
            not: null,
          },
        },
        select: {
          courseId: true,
        },
      });

      const courseIds = enrolledCourses
        .map((enrolled) => enrolled.courseId)
        .filter((id): id is string => id !== null);

      // Base where clause for enrolled users
      const whereClause = {
        user: {
          role: Role.STUDENT,
          organization: {
            id: currentUser.organization?.id,
          },
        },
        courseId: input.courseId === "all" ? { in: courseIds } : input.courseId,
        ...(currentUser.role === "MENTOR"
          ? { mentorUsername: currentUser.username }
          : {}),
      };

      const enrolledUsers = await ctx.db.enrolledUsers.findMany({
        where: whereClause,
        include: {
          user: true,
        },
      });

      // Base where clause for submissions
      const submissionsWhereClause = {
        enrolledUser: {
          user: {
            organization: {
              id: currentUser.organization?.id,
            },
            role: Role.STUDENT,
          },
          courseId:
            input.courseId === "all" ? { in: courseIds } : input.courseId,
          ...(currentUser.role === "MENTOR"
            ? { mentorUsername: currentUser.username }
            : {}),
        },
      };

      const submissions = await ctx.db.submission.findMany({
        where: submissionsWhereClause,
        include: {
          enrolledUser: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      // Base where clause for attendance
      const attendanceWhereClause = {
        attended: true,
        class: {
          courseId:
            input.courseId === "all" ? { in: courseIds } : input.courseId,
        },
        ...(currentUser.role === "MENTOR"
          ? { username: { in: enrolledUsers.map((eu) => eu.username) } }
          : {}),
      };

      const attendance = await ctx.db.attendance.findMany({
        where: attendanceWhereClause,
        include: {
          class: true,
        },
      });

      const groupedAttendance = attendance.reduce(
        (acc: Record<string, number>, curr) => {
          const username = curr.username;
          acc[username] = (acc[username] ?? 0) + 1;
          return acc;
        },
        {},
      );

      const totalClasses = await ctx.db.class.count({
        where: {
          courseId:
            input.courseId === "all" ? { in: courseIds } : input.courseId,
        },
      });

      const obj: Record<
        string,
        {
          username: string;
          name: string | null;
          submissions: Set<string>;
          submissionsLength: number;
          assignments: Set<string>;
          assignmentLength: number;
          mentorUsername: string | null;
          score?: number;
          submissionEvaluatedLength?: number;
          attendance?: number;
        }
      > = {};
      enrolledUsers.forEach((enrolledUser) => {
        obj[enrolledUser.username] = {
          username: enrolledUser.username,
          name: enrolledUser.user.name,
          submissions: new Set(),
          submissionsLength: 0,
          assignments: new Set(),
          assignmentLength: 0,
          mentorUsername: enrolledUser.mentorUsername,
        };
      });

      submissions.forEach((submission) => {
        const userObj = obj[submission.enrolledUser.username];
        if (userObj) {
          userObj.submissions.add(submission.id);
          userObj.submissionsLength++;
          if (submission.attachmentId) {
            userObj.assignments.add(submission.attachmentId);
          }
          userObj.assignmentLength = userObj.assignments.size;
          userObj.mentorUsername = submission.enrolledUser.mentorUsername;
        }
      });

      const points = await ctx.db.point.findMany({
        where: {
          submissions: {
            enrolledUser: {
              courseId:
                input.courseId === "all" ? { in: courseIds } : input.courseId,
              ...(currentUser.role === "MENTOR"
                ? { mentorUsername: currentUser.username }
                : {}),
            },
          },
        },
        include: {
          submissions: {
            include: {
              enrolledUser: true,
            },
          },
        },
      });

      Object.values(obj).forEach((ob) => {
        try {
          const userPoints = points.filter(
            (point) => point.submissions?.enrolledUser.username === ob.username,
          );

          ob.score = userPoints.reduce((acc, curr) => acc + curr.score, 0);
          ob.submissionEvaluatedLength = new Set(
            userPoints
              .map((point) => point.submissions?.id)
              .filter((id): id is string => id !== undefined),
          ).size;
        } catch (e) {
          console.log("Error while generating report : ", e);
        }
      });

      Object.values(obj).forEach((ob) => {
        if (input.courseId === "all") {
          const userAttendance = attendance.filter(
            (a) => a.username === ob.username,
          ).length;
          const totalClassesForUser = totalClasses;
          ob.attendance =
            totalClassesForUser === 0
              ? 0
              : (userAttendance * 100) / totalClassesForUser;
        } else {
          ob.attendance =
            ((groupedAttendance[ob.username] ?? 0) * 100) / totalClasses;
        }
      });

      const SelectedFields: ReportData[] = Object.values(obj).map((ob) => ({
        username: ob.username,
        name: ob.name,
        submissionLength: ob.submissionsLength,
        assignmentLength: ob.assignmentLength,
        score: ob.score ?? 0,
        submissionEvaluatedLength: ob.submissionEvaluatedLength ?? 0,
        attendance:
          typeof ob.attendance === "number" ? ob.attendance.toFixed(2) : "0.00",
        mentorUsername: ob.mentorUsername ?? "",
      }));

      SelectedFields.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
      SelectedFields.sort((a, b) => b.score - a.score);
      SelectedFields.sort((a, b) =>
        (a.mentorUsername ?? "").localeCompare(b.mentorUsername ?? ""),
      );

      return { success: true, data: SelectedFields };
    }),
});
