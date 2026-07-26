import { z } from "zod";

import { requireCourseReadAccess } from "../lib/authorization";
import { createTRPCRouter, permissionProcedure } from "../trpc";

export const leaderboardRouter = createTRPCRouter({
  getLeaderboardData: permissionProcedure("leaderboard", "read").query(
    async ({ ctx }) => {
      const currentUser = ctx.session.user;

      const mentor = await ctx.db.enrolledUsers.findMany({
        where: {
          username: currentUser.username,
          user: {
            organizationId: currentUser.organizationId,
          },
        },
        select: {
          mentorUsername: true,
        },
      });

      // Without a tenancy scope the `mentorUsername: null` fallback matches
      // every unassigned student in every tenant. An org-less user is only ever
      // in scope with themselves, since two nulls are not the same tenant.
      const orgScope = currentUser.organizationId
        ? { user: { organizationId: currentUser.organizationId } }
        : { username: currentUser.username };

      const submissions = await ctx.db.submission.findMany({
        where: {
          enrolledUser: {
            mentorUsername: mentor[0]?.mentorUsername ?? null,
            ...orgScope,
          },
          status: "SUBMITTED",
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
              mentor: {
                select: {
                  username: true,
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
        return {
          id: submission.id,
          totalPoints,
          submissionDate: submission.submissionDate,
          enrolledUser: {
            user: submission.enrolledUser.user,
            mentor: {
              username:
                submission.enrolledUser.mentor?.username ??
                currentUser.username,
            },
          },
          assignment: {
            class: {
              course: submission.assignment.class?.course ?? {
                id: "",
                title: "",
                startDate: new Date(),
              },
            },
          },
        };
      });

      const sortedSubmissions = totalPoints.sort(
        (a, b) => b.totalPoints - a.totalPoints,
      );

      const courses = await ctx.db.course.findMany({
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

      courses.forEach((course) => {
        course.classes.sort((a, b) => {
          return Number(a.createdAt) - Number(b.createdAt);
        });
      });

      const publishedCourses = courses.filter((course) => course.isPublished);
      const enrolledCourses =
        currentUser.role === "INSTRUCTOR" ? courses : publishedCourses;

      return {
        currentUser,
        submissions: sortedSubmissions,
        courses: enrolledCourses,
      };
    },
  ),

  getTutorLeaderboardData: permissionProcedure("leaderboard", "read")
    .input(
      z.object({
        course: z.string().optional(),
        mentor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      const { course, mentor } = input;

      // `course` was taken straight from input into the submissions filter, so
      // any authenticated user could read any course's submissions. Checked
      // outside the try so the denial is not flattened into a generic failure.
      if (course) {
        await requireCourseReadAccess(ctx, course);
      }

      const enrolledCourses = await ctx.db.enrolledUsers.findMany({
        where: {
          username: currentUser.username,
          courseId: {
            not: null,
          },
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              isPublished: true,
            },
          },
        },
      });

      const courses = enrolledCourses
        .map((enrolled) => enrolled.course)
        .filter(
          (course): course is NonNullable<typeof course> => course !== null,
        );

      const courseIds = courses.map((course) => course.id);

      const mentors =
        currentUser.role === "INSTRUCTOR"
          ? await ctx.db.enrolledUsers.findMany({
              where: {
                courseId: { in: courseIds },
                user: {
                  role: "MENTOR",
                  organizationId: currentUser.organizationId,
                },
              },
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    name: true,
                    image: true,
                    mobile: true,
                  },
                },
              },
              distinct: ["username"],
            })
          : [];

      const submissionsWhere = course
        ? {
            enrolledUser: {
              courseId: course,
              ...(currentUser.role === "MENTOR"
                ? { mentorUsername: currentUser.username }
                : {}),
            },
          }
        : {};

      const submissions = course
        ? await ctx.db.submission.findMany({
            where: { ...submissionsWhere, status: "SUBMITTED" },
            include: {
              points: true,
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
                  mentor: {
                    select: {
                      username: true,
                    },
                  },
                },
              },
              assignment: {
                select: {
                  class: {
                    select: {
                      course: {
                        select: {
                          id: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          })
        : [];

      const totalPoints = submissions.map((submission) => {
        const totalPoints = submission.points.reduce(
          (acc: number, curr: { score: number | null }) =>
            acc + (curr.score ?? 0),
          0,
        );
        return { ...submission, totalPoints };
      });

      const sortedSubmissions = totalPoints
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .map((submission, index) => ({
          ...submission,
          rank: index + 1,
        }));

      const publishedCourses = courses.filter((course) => course.isPublished);
      const accessibleCourses =
        currentUser.role === "INSTRUCTOR" ? courses : publishedCourses;

      const formattedMentors = mentors.map((mentor) => ({
        id: mentor.user.id,
        username: mentor.user.username,
        name: mentor.user.name,
        image: mentor.user.image,
        mobile: mentor.user.mobile,
        courseId: mentor.courseId,
      }));

      return {
        submissions: sortedSubmissions,
        courses: accessibleCourses,
        currentUser,
        mentors: formattedMentors,
        selectedCourse: course,
        selectedMentor: mentor,
      };
    }),
});
