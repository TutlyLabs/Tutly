import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@tutly/db";

import {
  requireCourseManageAccess,
  requireCourseReadAccess,
  requireUsernameInOrganization,
} from "../lib/authorization";
import {
  createTRPCRouter,
  permissionProcedure,
  protectedProcedure,
} from "../trpc";

export async function getEnrolledCourseIds(username: string) {
  const enrolledCourses = await db.enrolledUsers.findMany({
    where: {
      username: username,
      courseId: {
        not: null,
      },
    },
    select: {
      courseId: true,
    },
  });

  return enrolledCourses
    .map((enrolled) => enrolled.courseId)
    .filter((id): id is string => id !== null);
}

export const coursesRouter = createTRPCRouter({
  getAllCourses: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    const where =
      currentUser.role === "INSTRUCTOR"
        ? {
            OR: [
              { createdById: currentUser.id },
              { enrolledUsers: { some: { username: currentUser.username } } },
            ],
          }
        : currentUser.role === "MENTOR"
          ? {
              enrolledUsers: { some: { mentorUsername: currentUser.username } },
            }
          : { enrolledUsers: { some: { user: { id: currentUser.id } } } };

    return ctx.db.course.findMany({
      where,
      include: {
        _count: {
          select: {
            classes: true,
          },
        },
      },
    });
  }),

  foldersByCourseId: permissionProcedure("folder", "list")
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireCourseReadAccess(ctx, input.id);

      const folders = await ctx.db.folder.findMany({
        where: {
          Class: {
            some: {
              courseId: input.id,
            },
          },
        },
        include: {
          _count: {
            select: {
              Class: true,
            },
          },
        },
      });
      return folders;
    }),

  getEnrolledCourses: protectedProcedure.query(async ({ ctx }) => {
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
        classes: true,
        createdBy: true,
        _count: {
          select: {
            classes: true,
          },
        },
        courseAdmins: true,
      },
    });

    courses.forEach((course) => {
      course.classes.sort((a, b) => {
        return Number(a.createdAt) - Number(b.createdAt);
      });
    });

    if (currentUser.role === "INSTRUCTOR") {
      return courses;
    }
    return courses.filter((course) => course.isPublished);
  }),

  getMentorStudents: permissionProcedure("user", "list")
    .input(
      z.object({
        courseId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      if (!currentUser.organization) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User must belong to an organization",
        });
      }

      await requireCourseReadAccess(ctx, input.courseId);

      return ctx.db.user.findMany({
        where: {
          role: "STUDENT",
          enrolledUsers: {
            some: {
              mentorUsername: currentUser.username,
              courseId: input.courseId,
            },
          },
          organization: {
            id: currentUser.organization.id,
          },
        },
        include: {
          course: true,
          enrolledUsers: true,
        },
        orderBy: {
          username: "asc",
        },
      });
    }),

  createCourse: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        isPublished: z.boolean(),
        image: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      if (currentUser.role !== "INSTRUCTOR") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only instructors can create courses",
        });
      }
      if (!input.title.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Title is required",
        });
      }

      return ctx.db.course.create({
        data: {
          title: input.title,
          createdById: currentUser.id,
          isPublished: input.isPublished,
          image: input.image ?? null,
          enrolledUsers: {
            create: {
              username: currentUser.username,
            },
          },
        },
      });
    }),

  updateCourse: permissionProcedure("course", "update")
    .input(
      z.object({
        id: z.string(),
        title: z.string(),
        isPublished: z.boolean(),
        image: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireCourseManageAccess(ctx, input.id);

      if (!input.title.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Title is required",
        });
      }

      return ctx.db.course.update({
        where: {
          id: input.id,
        },
        data: {
          title: input.title,
          isPublished: input.isPublished,
          image: input.image ?? null,
        },
      });
    }),

  getCourseByCourseId: permissionProcedure("course", "read")
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireCourseReadAccess(ctx, input.id);

      const course = await ctx.db.course.findUnique({
        where: {
          id: input.id,
        },
      });
      if (!course) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      }
      return course;
    }),

  enrollStudentToCourse: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        username: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      if (currentUser.role !== "INSTRUCTOR") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unauthorized to enroll student to course",
        });
      }

      await requireCourseManageAccess(ctx, input.courseId);
      await requireUsernameInOrganization(ctx, input.username);

      const user = await ctx.db.user.findUnique({
        where: { username: input.username },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
      });

      if (!course) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      }

      const existingEnrollment = await ctx.db.enrolledUsers.findFirst({
        where: {
          courseId: input.courseId,
          username: input.username,
        },
      });

      if (existingEnrollment) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already enrolled in the course",
        });
      }

      const newEnrollment = await ctx.db.enrolledUsers.create({
        data: {
          courseId: input.courseId,
          username: input.username,
        },
      });

      await ctx.db.events.create({
        data: {
          eventCategory: "STUDENT_ENROLLMENT_IN_COURSE",
          causedById: currentUser.id,
          eventCategoryDataId: newEnrollment.id,
        },
      });

      // Auto-join course chat group if it exists
      const group = await ctx.db.chatGroup.findFirst({
        where: { courseId: input.courseId, type: "COURSE" },
      });
      if (group) {
        await ctx.db.groupMember.upsert({
          where: { groupId_userId: { groupId: group.id, userId: user.id } },
          create: { groupId: group.id, userId: user.id, role: "MEMBER" },
          update: {},
        });
      }

      return newEnrollment;
    }),

  unenrollStudentFromCourse: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        username: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      if (currentUser.role !== "INSTRUCTOR") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unauthorized to unenroll student from course",
        });
      }

      await requireCourseManageAccess(ctx, input.courseId);
      await requireUsernameInOrganization(ctx, input.username);

      const existingEnrollment = await ctx.db.enrolledUsers.findFirst({
        where: {
          courseId: input.courseId,
          username: input.username,
        },
      });

      if (!existingEnrollment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User is not enrolled in the course",
        });
      }

      return ctx.db.enrolledUsers.delete({
        where: {
          id: existingEnrollment.id,
        },
      });
    }),

  updateMentor: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        username: z.string(),
        mentorUsername: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      if (currentUser.role !== "INSTRUCTOR") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unauthorized to update mentor",
        });
      }

      await requireCourseManageAccess(ctx, input.courseId);
      await requireUsernameInOrganization(ctx, input.username);
      await requireUsernameInOrganization(ctx, input.mentorUsername);

      const enrolledUser = await ctx.db.enrolledUsers.findFirst({
        where: {
          courseId: input.courseId,
          username: input.username,
        },
      });

      if (!enrolledUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User is not enrolled in the course",
        });
      }

      const updatedUser = await ctx.db.enrolledUsers.update({
        where: {
          id: enrolledUser.id,
        },
        data: {
          mentorUsername: input.mentorUsername,
        },
      });

      // Auto-join mentor to the course chat group
      const mentor = await ctx.db.user.findUnique({
        where: { username: input.mentorUsername },
        select: { id: true },
      });
      if (mentor) {
        const group = await ctx.db.chatGroup.findFirst({
          where: { courseId: input.courseId, type: "COURSE" },
        });
        if (group) {
          await ctx.db.groupMember.upsert({
            where: { groupId_userId: { groupId: group.id, userId: mentor.id } },
            create: { groupId: group.id, userId: mentor.id, role: "MEMBER" },
            update: {},
          });
        }
      }

      return updatedUser;
    }),

  deleteCourse: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      if (currentUser.role !== "INSTRUCTOR") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only instructors can delete courses",
        });
      }

      // Scoped to the creator, and reported as NOT_FOUND so a non-owner is not
      // told that the course exists.
      const { count } = await ctx.db.course.deleteMany({
        where: { id: input.id, createdById: currentUser.id },
      });
      if (count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      }
    }),

  getCourseManagementUsers: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      if (currentUser.role !== "INSTRUCTOR") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only instructors can manage courses",
        });
      }

      return ctx.db.user.findMany({
        where: {
          organizationId: currentUser.organizationId,
        },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          image: true,
          enrolledUsers: {
            where: { courseId: input.courseId },
            select: {
              id: true,
              courseId: true,
              mentorUsername: true,
              username: true,
              startDate: true,
              endDate: true,
            },
          },
        },
        orderBy: [{ role: "asc" }, { username: "asc" }],
      });
    }),

  checkUserEnrolledCourses: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = ctx.session.user;

    if (currentUser.role !== "INSTRUCTOR" && currentUser.role !== "MENTOR") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Unauthorized access",
      });
    }

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

    return { hasEnrolledCourses: enrolledCourses.length > 0 };
  }),
});
