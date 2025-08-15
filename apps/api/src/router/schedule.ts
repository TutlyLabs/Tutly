import type { EventAttachmentType } from '@prisma/client';
import { z } from 'zod';

import { createTRPCRouter, protectedProcedure } from '../trpc';

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
              ordering: 'asc',
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

  createEvent: protectedProcedure
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

      if (currentUser.role !== 'INSTRUCTOR') {
        throw new Error('You are not authorized to create events');
      }

      const enrolledCourse = await ctx.db.enrolledUsers.findFirst({
        where: {
          username: currentUser.username,
          courseId: input.courseId,
        },
      });

      if (!enrolledCourse) {
        throw new Error('You do not have access to this course');
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

  updateEvent: protectedProcedure
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
      const currentUser = ctx.session.user;

      if (currentUser.role !== 'INSTRUCTOR') {
        throw new Error('You are not authorized to update events');
      }

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

  deleteEvent: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      const event = await ctx.db.scheduleEvent.findUnique({
        where: { id: input.id },
        include: {
          course: true,
        },
      });

      if (currentUser.role !== 'INSTRUCTOR' && event?.course?.createdById !== currentUser.id) {
        throw new Error('You are not authorized to delete events');
      }

      await ctx.db.scheduleEvent.delete({
        where: { id: input.id },
      });

      return {
        success: true,
      };
    }),

  addAttachment: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string(),
        type: z.enum([
          'YOUTUBE',
          'YOUTUBE_LIVE',
          'GMEET',
          'JIOMEET',
          'TEXT',
          'VIMEO',
          'VIDEOCRYPT',
          'DOCUMENT',
          'OTHER',
        ] as const satisfies ReadonlyArray<EventAttachmentType>),
        link: z.string().optional().nullable(),
        details: z.string().optional().nullable(),
        ordering: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;

      if (currentUser.role !== 'INSTRUCTOR') {
        throw new Error('You are not authorized to add attachments');
      }

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
                  attachmentType: 'ASSIGNMENT',
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
              type: 'Assignment',
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
          type: 'Class',
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
          type: 'Holiday',
          name: holiday.reason,
          description: holiday.description ?? 'Observed holiday',
          startDate: startDate,
          endDate: endDate,
          link: '/schedule',
        };
      });

      const isAuthorized = currentUser.role === 'INSTRUCTOR' || currentUser.role === 'MENTOR' || false;
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
      console.error('Error fetching schedule data:', error);
      return {
        success: false,
        error: 'Failed to fetch schedule data',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }),
});
