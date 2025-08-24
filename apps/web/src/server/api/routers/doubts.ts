import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

import { getEnrolledCourseIds } from "./courses";

export const doubtsRouter = createTRPCRouter({
  getUserDoubtsByCourseId: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const doubts = await ctx.db.doubt.findMany({
        where: {
          courseId: input.courseId,
        },
        include: {
          user: true,
          course: true,
          response: {
            include: {
              user: true,
            },
          },
        },
      });
      return { success: true, data: doubts };
    }),

  getEnrolledCoursesDoubts: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    const courses = await ctx.db.course.findMany({
      where: {
        enrolledUsers: {
          some: {
            username: currentUser.username,
          },
        },
      },
      include: {
        doubts: {
          include: {
            user: true,
            response: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });
    return { success: true, data: courses };
  }),

  getCreatedCoursesDoubts: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    const courseIds = await getEnrolledCourseIds(currentUser.username);

    const courses = await ctx.db.course.findMany({
      where: {
        id: {
          in: courseIds,
        },
      },
      include: {
        doubts: {
          include: {
            user: true,
            response: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });
    return { success: true, data: courses };
  }),

  getAllDoubtsForMentor: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    const mentorCourses = await ctx.db.course.findMany({
      where: {
        enrolledUsers: {
          some: {
            mentorUsername: currentUser.username,
          },
        },
      },
    });

    if (mentorCourses.length === 0) return { error: "No courses found" };

    const courses = await ctx.db.course.findMany({
      where: {
        id: {
          in: mentorCourses.map((course) => course.id),
        },
      },
      include: {
        doubts: {
          include: {
            user: true,
            response: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });
    return { success: true, data: courses };
  }),

  createDoubt: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        title: z.string(),
        description: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      if (currentUser.role === "INSTRUCTOR") {
        const userCourseIds = await getEnrolledCourseIds(currentUser.username);
        if (!userCourseIds.includes(input.courseId)) {
          throw new Error("You do not have access to this course");
        }
      }

      const doubt = await ctx.db.doubt.create({
        data: {
          courseId: input.courseId,
          userId: currentUser.id,
          title: input.title,
          description: input.description,
        },
        include: {
          user: true,
          course: true,
          response: {
            include: {
              user: true,
            },
          },
        },
      });

      await ctx.db.events.create({
        data: {
          eventCategory: "DOUBT_CREATION",
          causedById: currentUser.id,
          eventCategoryDataId: doubt.id,
        },
      });

      return { success: true, data: doubt };
    }),

  createResponse: protectedProcedure
    .input(
      z.object({
        doubtId: z.string(),
        description: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      const response = await ctx.db.response.create({
        data: {
          doubtId: input.doubtId,
          userId: currentUser.id,
          description: input.description,
        },
        include: {
          user: true,
        },
      });

      await ctx.db.events.create({
        data: {
          eventCategory: "DOUBT_RESPONSE",
          causedById: currentUser.id,
          eventCategoryDataId: response.id,
        },
      });
      return { success: true, data: response };
    }),

  deleteDoubt: protectedProcedure
    .input(
      z.object({
        doubtId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      const doubt = await ctx.db.doubt.delete({
        where: {
          id: input.doubtId,
          userId: currentUser.id,
        },
        include: {
          user: true,
          course: true,
          response: {
            include: {
              user: true,
            },
          },
        },
      });
      return { success: true, data: doubt };
    }),

  deleteAnyDoubt: protectedProcedure
    .input(
      z.object({
        doubtId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const doubt = await ctx.db.doubt.delete({
        where: {
          id: input.doubtId,
        },
        include: {
          user: true,
          course: true,
          response: {
            include: {
              user: true,
            },
          },
        },
      });
      return { success: true, data: doubt };
    }),

  deleteResponse: protectedProcedure
    .input(
      z.object({
        responseId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ctx.db.response.delete({
        where: {
          id: input.responseId,
        },
      });
      return { success: true, data: response };
    }),
});
