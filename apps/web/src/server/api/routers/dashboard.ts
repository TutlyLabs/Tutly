import { Role } from "@/lib/prisma";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const dashboardRouter = createTRPCRouter({
  getStudentDashboardData: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    try {
      const enrolledCourses = await ctx.db.enrolledUsers.findMany({
        where: {
          username: currentUser.username,
          user: {
            organizationId: currentUser.organizationId,
          },
        },
        select: {
          course: {
            select: {
              id: true,
              title: true,
              attachments: {
                where: {
                  attachmentType: "ASSIGNMENT",
                },
                select: {
                  id: true,
                  title: true,
                  submissions: {
                    where: {
                      enrolledUser: {
                        username: currentUser.username,
                      },
                      status: "SUBMITTED",
                    },
                    select: {
                      id: true,
                      points: {
                        select: {
                          score: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const dashboardData = {
        courses: enrolledCourses.map((enrolledCourse) => {
          const courseAssignments = enrolledCourse.course?.attachments ?? [];
          const submissions = courseAssignments.flatMap((a) => a.submissions);

          const totalPoints = submissions.reduce(
            (acc, curr) =>
              acc + curr.points.reduce((acc, curr) => acc + curr.score, 0),
            0,
          );

          return {
            courseId: enrolledCourse.course?.id,
            courseTitle: enrolledCourse.course?.title,
            assignments: courseAssignments,
            assignmentsSubmitted: submissions.length,
            totalPoints,
            totalAssignments: courseAssignments.length,
          };
        }),
        currentUser,
      };

      return { success: true, data: dashboardData };
    } catch (error) {
      console.error("Error fetching student dashboard data:", error);
      return {
        success: false,
        error: "Failed to fetch student dashboard data",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }),

  getMentorDashboardData: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    try {
      const mentorCourses = await ctx.db.course.findMany({
        where: {
          enrolledUsers: {
            some: {
              mentorUsername: currentUser.username,
              user: {
                organizationId: currentUser.organizationId,
              },
            },
          },
        },
        select: {
          id: true,
          title: true,
          attachments: {
            where: {
              attachmentType: "ASSIGNMENT",
            },
            select: {
              id: true,
              title: true,
            },
          },
          enrolledUsers: {
            where: {
              mentorUsername: currentUser.username,
            },
            select: {
              user: {
                select: {
                  username: true,
                },
              },
              submission: {
                select: {
                  id: true,
                  points: {
                    select: {
                      score: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const dashboardData = {
        courses: mentorCourses.map((mentorCourse) => {
          const courseEnrollments = mentorCourse.enrolledUsers;
          const submissions = courseEnrollments.flatMap((e) => e.submission);
          const evaluatedSubmissions = submissions.filter((s) =>
            s.points.some((p) => p.score > 0),
          );

          return {
            courseId: mentorCourse.id,
            courseTitle: mentorCourse.title,
            assignments: mentorCourse.attachments,
            menteeCount: courseEnrollments.length,
            evaluatedAssignments: evaluatedSubmissions.length,
            totalSubmissions: submissions.length,
          };
        }),
      };

      return { success: true, data: dashboardData };
    } catch (error) {
      console.error("Error fetching mentor dashboard data:", error);
      return {
        success: false,
        error: "Failed to fetch mentor dashboard data",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }),

  getInstructorDashboardData: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    try {
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

      const courses = await ctx.db.course.findMany({
        where: {
          id: {
            in: courseIds,
          },
        },
        select: {
          id: true,
          title: true,
          _count: {
            select: {
              classes: true,
              enrolledUsers: {
                where: {
                  user: {
                    role: "STUDENT",
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const dashboardData = {
        courses: courses.map((course) => ({
          courseId: course.id,
          courseTitle: course.title,
          classCount: course._count.classes,
          studentCount: course._count.enrolledUsers,
        })),
        totalCourses: courses.length,
      };

      return { success: true, data: dashboardData };
    } catch (error) {
      console.error("Error fetching instructor dashboard data:", error);
      return {
        success: false,
        error: "Failed to fetch instructor dashboard data",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }),

  getCourseSelectorData: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;
    const role: Role = currentUser.role;

    try {
      let courses: Array<{ courseId: string; courseTitle: string }> = [];

      if (role === Role.STUDENT) {
        const enrolledCourses = await ctx.db.enrolledUsers.findMany({
          where: {
            username: currentUser.username,
            user: {
              organizationId: currentUser.organizationId,
            },
          },
          select: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        courses = enrolledCourses.map((enrolledCourse) => ({
          courseId: enrolledCourse.course?.id ?? "",
          courseTitle: enrolledCourse.course?.title ?? "",
        }));
      } else if (role === Role.MENTOR) {
        const mentorCourses = await ctx.db.course.findMany({
          where: {
            enrolledUsers: {
              some: {
                mentorUsername: currentUser.username,
                user: {
                  organizationId: currentUser.organizationId,
                },
              },
            },
          },
          select: {
            id: true,
            title: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        courses = mentorCourses.map((course) => ({
          courseId: course.id,
          courseTitle: course.title,
        }));
      } else if (role === Role.INSTRUCTOR) {
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

        const instructorCourses = await ctx.db.course.findMany({
          where: {
            id: {
              in: courseIds,
            },
          },
          select: {
            id: true,
            title: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        courses = instructorCourses.map((course) => ({
          courseId: course.id,
          courseTitle: course.title,
        }));
      }

      return { success: true, data: { courses } };
    } catch (error) {
      console.error("Error fetching course selector data:", error);
      return {
        success: false,
        error: "Failed to fetch course selector data",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }),
});
