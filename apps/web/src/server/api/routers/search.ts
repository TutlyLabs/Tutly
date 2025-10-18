import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const searchRouter = createTRPCRouter({
  globalSearch: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        categories: z
          .array(
            z.enum([
              "all",
              "courses",
              "classes",
              "assignments",
              "doubts",
              "users",
              "schedule",
              "notifications",
            ]),
          )
          .optional()
          .default(["all"]),
        limit: z.number().min(1).max(50).optional().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      const { query, categories, limit } = input;

      const results = {
        courses: [] as any[],
        classes: [] as any[],
        assignments: [] as any[],
        doubts: [] as any[],
        users: [] as any[],
        schedule: [] as any[],
        notifications: [] as any[],
      };

      try {
        // Get user's accessible course IDs once (optimization)
        const getUserCourseIds = async () => {
          return await ctx.db.course.findMany({
            where:
              currentUser.role === "INSTRUCTOR"
                ? {
                    OR: [
                      { createdById: currentUser.id },
                      {
                        enrolledUsers: {
                          some: { username: currentUser.username },
                        },
                      },
                    ],
                  }
                : currentUser.role === "MENTOR"
                  ? {
                      enrolledUsers: {
                        some: { mentorUsername: currentUser.username },
                      },
                    }
                  : {
                      enrolledUsers: {
                        some: { username: currentUser.username },
                      },
                    },
            select: { id: true },
          });
        };

        let userCourseIds: { id: string }[] | null = null;
        const needsCourseIds = categories.some((cat) =>
          ["all", "classes", "assignments", "doubts", "schedule"].includes(cat),
        );

        if (needsCourseIds) {
          userCourseIds = await getUserCourseIds();
        }

        const courseIds = userCourseIds?.map((c) => c.id) || [];

        // Search Courses
        if (categories.includes("all") || categories.includes("courses")) {
          let coursesQuery: any = {
            where: {
              title: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            take: limit,
            select: {
              id: true,
              title: true,
              image: true,
              createdBy: {
                select: {
                  name: true,
                  username: true,
                },
              },
              _count: {
                select: {
                  classes: true,
                  enrolledUsers: true,
                },
              },
            },
            orderBy: {
              updatedAt: "desc" as const,
            },
          };

          // Filter by role
          if (currentUser.role === "INSTRUCTOR") {
            coursesQuery.where = {
              ...coursesQuery.where,
              OR: [
                { createdById: currentUser.id },
                {
                  enrolledUsers: {
                    some: {
                      username: currentUser.username,
                    },
                  },
                },
              ],
            };
          } else if (currentUser.role === "MENTOR") {
            coursesQuery.where = {
              ...coursesQuery.where,
              enrolledUsers: {
                some: {
                  mentorUsername: currentUser.username,
                },
              },
            };
          } else {
            coursesQuery.where = {
              ...coursesQuery.where,
              enrolledUsers: {
                some: {
                  username: currentUser.username,
                },
              },
            };
          }

          results.courses = await ctx.db.course.findMany(coursesQuery);
        }

        // Search Classes
        if (categories.includes("all") || categories.includes("classes")) {
          if (courseIds.length > 0) {
            results.classes = await ctx.db.class.findMany({
              where: {
                title: {
                  contains: query,
                  mode: "insensitive",
                },
                courseId: {
                  in: courseIds,
                },
              },
              take: limit,
              select: {
                id: true,
                title: true,
                courseId: true,
                course: {
                  select: {
                    title: true,
                  },
                },
                video: {
                  select: {
                    videoType: true,
                  },
                },
                createdAt: true,
              },
              orderBy: {
                createdAt: "desc",
              },
            });
          }
        }

        // Search Assignments
        if (categories.includes("all") || categories.includes("assignments")) {
          if (courseIds.length > 0) {
            results.assignments = await ctx.db.attachment.findMany({
              where: {
                title: {
                  contains: query,
                  mode: "insensitive",
                },
                attachmentType: "ASSIGNMENT",
                courseId: {
                  in: courseIds,
                },
              },
              take: limit,
              select: {
                id: true,
                title: true,
                courseId: true,
                course: {
                  select: {
                    title: true,
                  },
                },
                dueDate: true,
                submissionMode: true,
                _count: {
                  select: {
                    submissions: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
            });
          }
        }

        // Search Doubts
        if (categories.includes("all") || categories.includes("doubts")) {
          if (courseIds.length > 0) {
            results.doubts = await ctx.db.doubt.findMany({
              where: {
                OR: [
                  {
                    title: {
                      contains: query,
                      mode: "insensitive",
                    },
                  },
                  {
                    description: {
                      contains: query,
                      mode: "insensitive",
                    },
                  },
                ],
                courseId: {
                  in: courseIds,
                },
              },
              take: limit,
              select: {
                id: true,
                title: true,
                description: true,
                courseId: true,
                user: {
                  select: {
                    name: true,
                    username: true,
                    image: true,
                  },
                },
                course: {
                  select: {
                    title: true,
                  },
                },
                _count: {
                  select: {
                    response: true,
                  },
                },
                createdAt: true,
              },
              orderBy: {
                createdAt: "desc",
              },
            });
          }
        }

        // Search Users (only for instructors and mentors)
        if (
          (categories.includes("all") || categories.includes("users")) &&
          (currentUser.role === "INSTRUCTOR" || currentUser.role === "MENTOR")
        ) {
          if (courseIds.length > 0) {
            results.users = await ctx.db.user.findMany({
              where: {
                AND: [
                  currentUser.role === "MENTOR"
                    ? { role: "STUDENT" } // Mentors can only see students
                    : { role: { in: ["STUDENT", "MENTOR"] } }, // Instructors can see students and mentors
                  {
                    enrolledUsers: {
                      some: {
                        courseId: {
                          in: courseIds,
                        },
                      },
                    },
                  },
                  {
                    OR: [
                      {
                        name: {
                          contains: query,
                          mode: "insensitive",
                        },
                      },
                      {
                        username: {
                          contains: query,
                          mode: "insensitive",
                        },
                      },
                      {
                        email: {
                          contains: query,
                          mode: "insensitive",
                        },
                      },
                    ],
                  },
                ],
              },
              take: limit,
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
                image: true,
                role: true,
              },
              orderBy: {
                name: "asc",
              },
            });
          }
        }

        // Search Schedule Events
        if (categories.includes("all") || categories.includes("schedule")) {
          if (courseIds.length > 0) {
            results.schedule = await ctx.db.scheduleEvent.findMany({
              where: {
                title: {
                  contains: query,
                  mode: "insensitive",
                },
                courseId: {
                  in: courseIds,
                },
              },
              take: limit,
              select: {
                id: true,
                title: true,
                startTime: true,
                endTime: true,
                courseId: true,
                course: {
                  select: {
                    title: true,
                  },
                },
                isPublished: true,
              },
              orderBy: {
                startTime: "desc",
              },
            });
          }
        }

        // Search Notifications
        if (
          categories.includes("all") ||
          categories.includes("notifications")
        ) {
          results.notifications = await ctx.db.notification.findMany({
            where: {
              intendedForId: currentUser.id,
              message: {
                contains: query,
                mode: "insensitive",
              },
            },
            take: limit,
            select: {
              id: true,
              message: true,
              eventType: true,
              readAt: true,
              customLink: true,
              causedBy: {
                select: {
                  name: true,
                  username: true,
                  image: true,
                },
              },
              createdAt: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          });
        }

        return {
          success: true,
          data: results,
        };
      } catch (error) {
        console.error("Error in global search:", error);
        return {
          success: false,
          error: "Failed to perform search",
          data: results,
        };
      }
    }),

  getRecentItems: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    try {
      // Get user's courses
      const userCourses = await ctx.db.course.findMany({
        where:
          currentUser.role === "INSTRUCTOR"
            ? {
                OR: [
                  { createdById: currentUser.id },
                  {
                    enrolledUsers: {
                      some: { username: currentUser.username },
                    },
                  },
                ],
              }
            : currentUser.role === "MENTOR"
              ? {
                  enrolledUsers: {
                    some: { mentorUsername: currentUser.username },
                  },
                }
              : {
                  enrolledUsers: {
                    some: { username: currentUser.username },
                  },
                },
        take: 5,
        select: {
          id: true,
          title: true,
          image: true,
          updatedAt: true,
          _count: {
            select: {
              classes: true,
              enrolledUsers: currentUser.role === "INSTRUCTOR",
            },
          },
          ...(currentUser.role === "MENTOR" && {
            enrolledUsers: {
              where: {
                mentorUsername: currentUser.username,
              },
              select: {
                id: true,
              },
            },
          }),
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      const coursesWithCounts = userCourses.map((course: any) => ({
        ...course,
        _count: {
          classes: course._count.classes,
          enrolledUsers: course._count.enrolledUsers,
          mentees:
            currentUser.role === "MENTOR"
              ? course.enrolledUsers?.length || 0
              : undefined,
        },
        enrolledUsers: undefined,
      }));

      const courseIds = userCourses.map((c) => c.id);

      // Get recent classes
      const recentClasses = courseIds.length
        ? await ctx.db.class.findMany({
            where: {
              courseId: {
                in: courseIds,
              },
            },
            take: 5,
            select: {
              id: true,
              title: true,
              courseId: true,
              course: {
                select: {
                  title: true,
                },
              },
              updatedAt: true,
            },
            orderBy: {
              updatedAt: "desc",
            },
          })
        : [];

      // Get recent assignments
      const recentAssignments = courseIds.length
        ? await ctx.db.attachment.findMany({
            where: {
              courseId: {
                in: courseIds,
              },
              attachmentType: "ASSIGNMENT",
            },
            take: 5,
            select: {
              id: true,
              title: true,
              courseId: true,
              dueDate: true,
              course: {
                select: {
                  title: true,
                },
              },
              updatedAt: true,
            },
            orderBy: {
              updatedAt: "desc",
            },
          })
        : [];

      return {
        success: true,
        data: {
          courses: coursesWithCounts,
          classes: recentClasses,
          assignments: recentAssignments,
        },
      };
    } catch (error) {
      console.error("Error getting recent items:", error);
      return {
        success: false,
        error: "Failed to get recent items",
      };
    }
  }),
});
