import { NotificationEvent, NotificationMedium } from "@/lib/prisma";
import { z } from "zod";

import { db } from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const notificationsRouter = createTRPCRouter({
  getNotifications: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const notifications = await ctx.db.notification.findMany({
      where: { intendedForId: userId },
      orderBy: { createdAt: "desc" },
    });
    return notifications;
  }),

  toggleNotificationAsReadStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.db.notification.findUnique({
        where: { id: input.id },
      });

      const updatedNotification = await ctx.db.notification.update({
        where: { id: input.id },
        data: {
          readAt: notification?.readAt ? null : new Date(),
        },
      });
      return updatedNotification;
    }),

  markAllNotificationsAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    await ctx.db.notification.updateMany({
      where: {
        intendedForId: userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }),

  getNotificationConfig: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const subscription = await ctx.db.pushSubscription.findFirst({
        where: { userId: input.userId },
      });
      return subscription;
    }),

  updateNotificationConfig: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        config: z.object({
          endpoint: z.string(),
          p256dh: z.string(),
          auth: z.string(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, config } = input;
      const { endpoint, p256dh, auth } = config;

      // Delete existing subscription if endpoint is empty
      if (!endpoint) {
        await ctx.db.pushSubscription.deleteMany({
          where: { userId },
        });
        return null;
      }

      // Upsert subscription
      const subscription = await ctx.db.pushSubscription.upsert({
        where: {
          endpoint,
        },
        update: {
          p256dh,
          auth,
        },
        create: {
          userId,
          endpoint,
          p256dh,
          auth,
        },
      });

      return subscription;
    }),

  notifyUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        message: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUserId = ctx.session.user.id;

      const notification = await ctx.db.notification.create({
        data: {
          message: input.message,
          eventType: NotificationEvent.CUSTOM_MESSAGE,
          causedById: currentUserId,
          intendedForId: input.userId,
          mediumSent: NotificationMedium.NOTIFICATION,
        },
      });

      return notification;
    }),

  notifyBulkUsers: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        message: z.string(),
        customLink: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.session.user;
      const organizationId = currentUser.organization?.id;
      if (!organizationId) {
        throw new Error("User not authenticated or missing organization");
      }

      const enrolledUsers = await ctx.db.enrolledUsers.findMany({
        where: {
          courseId: input.courseId,
          user: {
            role: {
              in: ["STUDENT", "MENTOR"],
            },
            organization: {
              id: organizationId,
            },
          },
        },
        select: { user: { select: { id: true } } },
      });

      const notifications = await Promise.all(
        enrolledUsers.map((enrolled) =>
          db.notification.create({
            data: {
              message: input.message,
              eventType: NotificationEvent.CUSTOM_MESSAGE,
              causedById: currentUser.id,
              intendedForId: enrolled.user.id,
              mediumSent: NotificationMedium.NOTIFICATION,
              customLink: input.customLink ?? null,
            },
          }),
        ),
      );

      return notifications;
    }),

  handleNotificationRedirect: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const notification = await ctx.db.notification.findUnique({
          where: {
            id: input.notificationId,
          },
        });

        if (!notification) {
          return { success: false, error: "Notification not found" };
        }

        // Mark notification as read
        await ctx.db.notification.update({
          where: { id: input.notificationId },
          data: { readAt: new Date() },
        });

        return {
          success: true,
          data: {
            notification,
          },
        };
      } catch (error) {
        console.error("Error handling notification redirect:", error);
        return {
          success: false,
          error: "Failed to handle notification redirect",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    }),

  getNotificationRedirectData: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const { notificationId } = input;

        if (!notificationId) {
          return { success: false, error: "Notification ID is required" };
        }

        const notification = await ctx.db.notification.findUnique({
          where: {
            id: notificationId,
          },
        });

        if (!notification) {
          return { success: false, error: "Notification not found" };
        }

        // Check if notification has a custom link
        if (notification.customLink) {
          return {
            success: true,
            data: {
              redirectUrl: notification.customLink,
              notification,
            },
          };
        }

        // Parse caused objects for link generation
        const causedObj = notification.causedObjects
          ? (JSON.parse(JSON.stringify(notification.causedObjects)) as Record<
              string,
              string
            >)
          : {};

        return {
          success: true,
          data: {
            notification,
            causedObj,
            eventType: notification.eventType,
          },
        };
      } catch (error) {
        console.error("Error fetching notification redirect data:", error);
        return {
          success: false,
          error: "Failed to fetch notification redirect data",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    }),
});
