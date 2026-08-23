import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { requireCourseManageAccess } from "../../lib/authorization";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { dryRunSchema, requireGrant, titleSchema } from "./shared";

export const agentCoursesRouter = createTRPCRouter({
  /**
   * Courses the authenticated user can manage (created or co-admin).
   * Includes counts so the agent has context without a second call.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;

    const courses = await ctx.db.course.findMany({
      where: {
        OR: [
          { createdById: user.id },
          { courseAdmins: { some: { id: user.id } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        isPublished: true,
        image: true,
        createdAt: true,
        _count: {
          select: {
            classes: true,
            attachments: true,
            enrolledUsers: true,
          },
        },
      },
    });

    return courses.map((course) => ({
      id: course.id,
      title: course.title,
      isPublished: course.isPublished,
      image: course.image,
      createdAt: course.createdAt,
      classCount: course._count.classes,
      assignmentCount: course._count.attachments,
      enrolledCount: course._count.enrolledUsers,
    }));
  }),

  /**
   * Create (omit courseId) or update (pass it). On create the caller is
   * auto-enrolled, matching the web UI behaviour.
   */
  upsert: protectedProcedure
    .input(
      z.object({
        courseId: z.string().optional(),
        title: titleSchema,
        isPublished: z.boolean().optional(),
        image: z.string().trim().url().nullable().optional(),
        dryRun: dryRunSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isUpdate = Boolean(input.courseId);
      requireGrant(ctx.session, "course", isUpdate ? "update" : "create");

      if (input.courseId) {
        await requireCourseManageAccess(ctx, input.courseId);
      }

      if (input.dryRun) {
        return {
          dryRun: true as const,
          action: isUpdate ? ("update" as const) : ("create" as const),
          courseId: input.courseId ?? null,
          title: input.title,
          isPublished: input.isPublished ?? (isUpdate ? "unchanged" : false),
        };
      }

      const { user } = ctx.session;

      if (input.courseId) {
        const updated = await ctx.db.course.update({
          where: { id: input.courseId },
          data: {
            title: input.title,
            ...(input.isPublished !== undefined
              ? { isPublished: input.isPublished }
              : {}),
            ...(input.image !== undefined ? { image: input.image } : {}),
          },
        });

        return {
          dryRun: false as const,
          action: "update" as const,
          course: {
            id: updated.id,
            title: updated.title,
            isPublished: updated.isPublished,
            image: updated.image,
          },
        };
      }

      // Create — auto-enrol the creator, matching the web UI.
      const created = await ctx.db.course.create({
        data: {
          title: input.title,
          createdById: user.id,
          isPublished: input.isPublished ?? false,
          image: input.image ?? null,
          enrolledUsers: {
            create: {
              username: user.username,
            },
          },
        },
      });

      return {
        dryRun: false as const,
        action: "create" as const,
        course: {
          id: created.id,
          title: created.title,
          isPublished: created.isPublished,
          image: created.image,
        },
      };
    }),

  /** Delete with blast-radius preview via dryRun. */
  delete: protectedProcedure
    .input(z.object({ courseId: z.string(), dryRun: dryRunSchema }))
    .mutation(async ({ ctx, input }) => {
      requireGrant(ctx.session, "course", "delete");
      await requireCourseManageAccess(ctx, input.courseId);

      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
        select: {
          id: true,
          title: true,
          _count: {
            select: {
              classes: true,
              attachments: true,
              enrolledUsers: true,
            },
          },
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      const impact = {
        courseId: course.id,
        title: course.title,
        classes: course._count.classes,
        assignments: course._count.attachments,
        enrolledUsers: course._count.enrolledUsers,
      };

      if (input.dryRun) return { dryRun: true as const, impact };

      await ctx.db.course.delete({ where: { id: input.courseId } });
      return { dryRun: false as const, deleted: true as const, impact };
    }),
});
