import { NotificationEvent, NotificationMedium } from "@prisma/client";
import webPush from "web-push";
import { z } from "zod";

import { db } from "@tutly/db";

import {
  NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT,
} from "../lib/constants";
import { createTRPCRouter, protectedProcedure } from "../trpc";

webPush.setVapidDetails(
  VAPID_SUBJECT,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
);

async function sendPushNotification(
  userId: string,
  message: string,
  notificationId: string,
) {
  const subscription = await db.pushSubscription.findFirst({
    where: { userId },
  });

  if (!subscription) return;

  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify({
        message,
        id: notificationId,
        type: "NOTIFICATION",
      }),
    );
  } catch (error) {
    console.error("Failed to send push notification:", error);
    if ((error as { statusCode?: number }).statusCode === 410) {
      await db.pushSubscription.delete({
        where: { endpoint: subscription.endpoint },
      });
    }
  }
}

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

      await sendPushNotification(input.userId, input.message, notification.id);

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

      await Promise.all(
        enrolledUsers.map(async (enrolled, index) => {
          const notification = notifications[index];
          if (!notification) {
            throw new Error("Notification not found");
          }
          await sendPushNotification(
            enrolled.user.id,
            input.message,
            notification.id,
          );
        }),
      );

      return notifications;
    }),
});
