import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  requireCourseReadAccess,
  requireRecordOwner,
} from "../lib/authorization";
import {
  createTRPCRouter,
  permissionProcedure,
  protectedProcedure,
} from "../trpc";

import { getEnrolledCourseIds } from "./courses";

export const doubtsRouter = createTRPCRouter({
  getUserDoubtsByCourseId: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireCourseReadAccess(ctx, input.courseId);

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

  getDoubtById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const doubt = await ctx.db.doubt.findUnique({
        where: { id: input.id },
        include: {
          user: { select: { id: true, name: true, username: true, image: true, role: true } },
          course: { select: { id: true, title: true } },
          response: {
            include: {
              user: { select: { id: true, name: true, username: true, image: true, role: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });
      if (!doubt) return null;
      if (doubt.courseId) {
        await requireCourseReadAccess(ctx, doubt.courseId);
      } else {
        requireRecordOwner(ctx, doubt, { allowStaff: true });
      }

      // Find the community group for this course
      const group = doubt.courseId
        ? await ctx.db.chatGroup.findFirst({
            where: { courseId: doubt.courseId, type: "COURSE" },
            select: { id: true },
          })
        : null;

      return { doubt, communityGroupId: group?.id ?? null };
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
      await requireCourseReadAccess(ctx, input.courseId);

      if (currentUser.role === "INSTRUCTOR") {
        const userCourseIds = await getEnrolledCourseIds(currentUser.username);
        if (!userCourseIds.includes(input.courseId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this course",
          });
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

      const doubt = await ctx.db.doubt.findUnique({
        where: { id: input.doubtId },
        select: { id: true, userId: true, courseId: true },
      });
      if (!doubt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Doubt not found" });
      }
      if (doubt.courseId) {
        await requireCourseReadAccess(ctx, doubt.courseId);
      } else {
        requireRecordOwner(ctx, doubt, { allowStaff: true });
      }

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

  deleteAnyDoubt: permissionProcedure("doubt", "deleteAny")
    .input(
      z.object({
        doubtId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.doubt.findUnique({
        where: { id: input.doubtId },
        select: { id: true, userId: true, courseId: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Doubt not found" });
      }
      if (existing.courseId) {
        await requireCourseReadAccess(ctx, existing.courseId);
      } else {
        requireRecordOwner(ctx, existing, { allowStaff: true });
      }

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
      const existing = await ctx.db.response.findUnique({
        where: { id: input.responseId },
        select: { id: true, userId: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Response not found",
        });
      }
      requireRecordOwner(ctx, existing, { allowStaff: true });

      const response = await ctx.db.response.delete({
        where: {
          id: input.responseId,
        },
      });
      return { success: true, data: response };
    }),
});
