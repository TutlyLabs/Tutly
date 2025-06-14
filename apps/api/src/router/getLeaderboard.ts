import type { Course, submission, User } from "@prisma/client";

import { db } from "@tutly/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export interface LeaderboardSubmission extends Partial<submission> {
  totalPoints: number;
  enrolledUser: {
    user: Pick<User, "id" | "name" | "username" | "image">;
  };
  assignment?: {
    class?: {
      course?: Pick<Course, "id" | "title" | "startDate"> | null;
    } | null;
  };
}

async function getLeaderboardDataForUser(
  userId: string,
  organizationId: string,
) {
  if (!userId || !organizationId) {
    return { error: "Invalid user or organization ID" };
  }
  try {
    const mentor = await db.enrolledUsers.findMany({
      where: {
        username: userId,
        user: {
          organizationId,
        },
      },
      select: {
        mentorUsername: true,
      },
    });

    const submissions = await db.submission.findMany({
      where: {
        enrolledUser: {
          mentorUsername: mentor[0]?.mentorUsername ?? null,
        },
      },
      select: {
        id: true,
        points: true,
        assignment: {
          select: {
            class: {
              select: {
                course: {
                  select: {
                    id: true,
                    title: true,
                    startDate: true,
                  },
                },
              },
            },
          },
        },
        submissionDate: true,
        enrolledUser: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
          },
        },
      },
    });

    const submissionsUptoLastSunday = submissions.filter((submission) => {
      const submissionDate = new Date(submission.submissionDate);
      const currentDate = new Date();
      const currentDayOfWeek = currentDate.getDay();
      const daysToLastSunday = currentDayOfWeek === 0 ? 7 : currentDayOfWeek;
      const lastSunday = new Date(currentDate);
      lastSunday.setDate(currentDate.getDate() - daysToLastSunday);
      lastSunday.setHours(12, 0, 0, 0);
      return submissionDate < lastSunday;
    });

    const totalPoints: LeaderboardSubmission[] = submissionsUptoLastSunday.map(
      (submission) => {
        const totalPoints = submission.points.reduce(
          (acc: number, curr: { score: number | null }) =>
            acc + (curr.score ?? 0),
          0,
        );
        return {
          id: submission.id,
          totalPoints,
          submissionDate: submission.submissionDate,
          enrolledUser: submission.enrolledUser,
          assignment: submission.assignment,
        };
      },
    );

    const sortedSubmissions = totalPoints.sort(
      (a, b) => b.totalPoints - a.totalPoints,
    );

    return { success: true, data: sortedSubmissions };
  } catch (error) {
    console.error("Error in getLeaderboardData:", error);
    return { error: "Failed to get leaderboard data" };
  }
}

export const leaderboardRouter = createTRPCRouter({
  getLeaderboardData: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    if (!currentUser.organization) {
      return { error: "Unauthorized" };
    }

    const result = await getLeaderboardDataForUser(
      currentUser.id,
      currentUser.organization.id,
    );
    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: { sortedSubmissions: result.data, currentUser },
    };
  }),

  getLeaderboardDataForStudent: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    if (!currentUser.organization) {
      return { error: "Unauthorized" };
    }

    const result = await getLeaderboardDataForUser(
      currentUser.id,
      currentUser.organization.id,
    );
    if (!result.success) {
      return result;
    }

    const totalPoints = result.data
      .filter(
        (submission: LeaderboardSubmission) =>
          submission.enrolledUser.user.id === currentUser.id,
      )
      .reduce(
        (total: number, submission: LeaderboardSubmission) =>
          total + submission.totalPoints,
        0,
      );

    return { success: true, data: totalPoints };
  }),

  getSubmissionsCountOfAllStudents: protectedProcedure.query(
    async ({ ctx }) => {
      const submissions = await ctx.db.submission.findMany({
        select: {
          enrolledUser: {
            select: {
              username: true,
            },
          },
          points: true,
        },
        where: {
          points: {
            some: {
              score: {
                gt: 0,
              },
            },
          },
        },
      });

      const groupedSubmissions = submissions.reduce(
        (acc: Record<string, number>, curr) => {
          const username = curr.enrolledUser.username;
          acc[username] = (acc[username] ?? 0) + 1;
          return acc;
        },
        {},
      );

      return { success: true, data: groupedSubmissions };
    },
  ),

  getMentorLeaderboardData: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    const submissions = await ctx.db.submission.findMany({
      where: {
        enrolledUser: {
          mentorUsername: currentUser.username,
        },
      },
      select: {
        id: true,
        points: true,
        assignment: {
          select: {
            class: {
              select: {
                course: {
                  select: {
                    id: true,
                    title: true,
                    startDate: true,
                  },
                },
              },
            },
          },
        },
        enrolledUser: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
          },
        },
      },
    });

    const totalPoints = submissions.map((submission) => {
      const totalPoints = submission.points.reduce(
        (acc: number, curr: { score: number | null }) =>
          acc + (curr.score ?? 0),
        0,
      );
      return { ...submission, totalPoints, rank: 0 };
    });

    const sortedSubmissions = totalPoints.sort(
      (a, b) => b.totalPoints - a.totalPoints,
    );

    sortedSubmissions.forEach((submission, index) => {
      submission.rank = index + 1;
    });

    return { success: true, data: { sortedSubmissions, currentUser } };
  }),

  getMentorLeaderboardDataForDashboard: protectedProcedure.query(
    async ({ ctx }) => {
      const currentUser = ctx.session.user;

      const submissions = await ctx.db.submission.findMany({
        where: {
          enrolledUser: {
            mentorUsername: currentUser.username,
          },
        },
        include: {
          points: true,
        },
      });

      const filteredSubmissions = submissions.filter(
        (submission) => submission.points.length > 0,
      );

      return { success: true, data: filteredSubmissions.length };
    },
  ),

  getDashboardData: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    if (!currentUser.organization) {
      return { error: "Unauthorized" };
    }

    const result = await getLeaderboardDataForUser(
      currentUser.id,
      currentUser.organization.id,
    );
    if (!result.success) {
      return { error: "Failed to get leaderboard data" };
    }

    const assignmentsSubmitted = result.data.filter(
      (x: LeaderboardSubmission) => x.enrolledUser.user.id === currentUser.id,
    ).length;

    return {
      success: true,
      data: {
        sortedSubmissions: result.data,
        assignmentsSubmitted,
        currentUser,
      },
    };
  }),
});
