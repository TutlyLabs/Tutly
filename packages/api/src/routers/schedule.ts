import type { EventAttachmentType } from "@tutly/db/browser";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createLogger } from "@tutly/logger";

import { requireUser } from "../lib/authorization";
import {
  createTRPCRouter,
  permissionProcedure,
  protectedProcedure,
  type TRPCContext,
} from "../trpc";

/**
 * Events are scoped by enrolment in their course, which is the rule createEvent
 * already applied to the course being written to. The sibling mutations took an
 * event id and no course scope at all, so they get the same rule here.
 */
async function requireEventAccess(ctx: TRPCContext, eventId: string) {
  const user = requireUser(ctx);
  const event = await ctx.db.scheduleEvent.findUnique({
    where: { id: eventId },
    select: { id: true, courseId: true, createdById: true },
  });
  if (!event) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
  }

  if (!event.courseId) {
    // No course to scope against, so only the author may touch it.
    if (event.createdById !== user.id) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
    }
    return event;
  }

  const enrolled = await ctx.db.enrolledUsers.count({
    where: { username: user.username, courseId: event.courseId },
  });
  if (enrolled === 0) {
    // NOT_FOUND, not FORBIDDEN: do not confirm the event id to an outsider.
    throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
  }

  return event;
}

const logger = createLogger("api:schedule");

export const scheduleRouter = createTRPCRouter({
  getSchedule: protectedProcedure
    .input(
      z.object({
        date: z.string().datetime(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      // Create start and end dates for the query
      const startDate = new Date(input.date);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      endDate.setHours(0, 0, 0, 0);

      const events = await ctx.db.scheduleEvent.findMany({
        where: {
          AND: [
            {
              startTime: {
                gte: startDate,
              },
            },
            {
              startTime: {
                lt: endDate,
              },
            },
          ],
          course: {
            enrolledUsers: {
              some: { username: currentUser.username },
            },
          },
        },
        include: {
          attachments: {
            orderBy: {
              ordering: "asc",
            },
          },
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      return {
        events,
      };
    }),

  createEvent: permissionProcedure("schedule", "create")
    .input(
      z.object({
        title: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        courseId: z.string(),
        isPublished: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      const enrolledCourse = await ctx.db.enrolledUsers.findFirst({
        where: {
          username: currentUser.username,
          courseId: input.courseId,
        },
      });

      if (!enrolledCourse) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      const newEvent = await ctx.db.scheduleEvent.create({
        data: {
          title: input.title,
          startTime: new Date(input.startTime),
          endTime: new Date(input.endTime),
          courseId: input.courseId,
          createdById: currentUser.id,
          isPublished: input.isPublished,
        },
        include: {
          attachments: true,
        },
      });

      return {
        event: newEvent,
      };
    }),

  updateEvent: permissionProcedure("schedule", "update")
    .input(
      z.object({
        id: z.string(),
        title: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        isPublished: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireEventAccess(ctx, input.id);

      await ctx.db.eventAttachment.deleteMany({
        where: { eventId: input.id },
      });

      const updatedEvent = await ctx.db.scheduleEvent.update({
        where: { id: input.id },
        data: {
          title: input.title,
          startTime: new Date(input.startTime),
          endTime: new Date(input.endTime),
          isPublished: input.isPublished,
        },
        include: {
          attachments: true,
        },
      });

      return {
        event: updatedEvent,
      };
    }),

  deleteEvent: permissionProcedure("schedule", "delete")
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireEventAccess(ctx, input.id);

      await ctx.db.scheduleEvent.delete({
        where: { id: input.id },
      });

      return {
        success: true,
      };
    }),

  addAttachment: permissionProcedure("schedule", "addAttachment")
    .input(
      z.object({
        id: z.string(),
        title: z.string(),
        type: z.enum([
          "YOUTUBE",
          "YOUTUBE_LIVE",
          "GMEET",
          "JIOMEET",
          "ZOOM",
          "ZOOM_LIVE",
          "TEXT",
          "VIMEO",
          "VIDEOCRYPT",
          "DOCUMENT",
          "OTHER",
        ] as const satisfies ReadonlyArray<EventAttachmentType>),
        link: z.string().optional().nullable(),
        details: z.string().optional().nullable(),
        ordering: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireEventAccess(ctx, input.id);

      const newAttachment = await ctx.db.eventAttachment.create({
        data: {
          title: input.title,
          type: input.type,
          eventId: input.id,
          details: input.details ?? null,
          ordering: input.ordering ?? 1,
          link: input.link ?? null,
        },
      });

      return {
        attachment: newAttachment,
      };
    }),

  getScheduleData: protectedProcedure.query(async ({ ctx }) => {
    try {
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
          classes: {
            include: {
              attachments: {
                where: {
                  attachmentType: "ASSIGNMENT",
                },
              },
            },
          },
        },
      });

      const holidays = await ctx.db.holidays.findMany({});

      const assignments = courses.flatMap((course) =>
        course.classes.flatMap((classItem) =>
          classItem.attachments.map((attachment) => {
            const createdAtDate = new Date(attachment.createdAt);
            const startDate = new Date(createdAtDate);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(createdAtDate);
            endDate.setHours(23, 59, 59, 999);

            return {
              type: "Assignment",
              name: attachment.title,
              description: `Assignment added on ${new Date(attachment.createdAt).toLocaleString()}`,
              startDate,
              endDate,
              link: `assignments/${attachment.id}`,
            };
          }),
        ),
      );

      const classEvents = courses.flatMap((course) =>
        course.classes.map((classItem) => ({
          type: "Class",
          name: classItem.title,
          description: `Session starts at ${new Date(classItem.createdAt).toLocaleString()}`,
          startDate: new Date(classItem.createdAt),
          endDate: new Date(classItem.createdAt.getTime() + 2000 * 60 * 60),
          link: `courses/${course.id}/classes/${classItem.id}`,
        })),
      );

      const holidayEvents = holidays.map((holiday) => {
        const startDate = new Date(holiday.startDate);
        const endDate = new Date(holiday.endDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        return {
          type: "Holiday",
          name: holiday.reason,
          description: holiday.description ?? "Observed holiday",
          startDate: startDate,
          endDate: endDate,
          link: "/schedule",
        };
      });

      const isAuthorized =
        currentUser.role === "INSTRUCTOR" ||
        currentUser.role === "MENTOR" ||
        false;
      const events = [...assignments, ...classEvents, ...holidayEvents];

      return {
        success: true,
        data: {
          events,
          isAuthorized,
          holidays,
        },
      };
    } catch (error) {
      logger.error(
        { err: error, userId: ctx.session.user.id },
        "fetch schedule data failed",
      );
      return {
        success: false,
        error: "Failed to fetch schedule data",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }),
});
