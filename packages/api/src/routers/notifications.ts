import { NotificationEvent, NotificationMedium } from "@tutly/db/browser";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@tutly/db";
import {
  requireCourseReadAccess,
  requireUserInOrganization,
} from "../lib/authorization";
import { sendPushToUser } from "../lib/push";
import {
  createTRPCRouter,
  permissionProcedure,
  protectedProcedure,
} from "../trpc";

/** Push config is per-device and self-owned; no role may target another user. */
function requireSelf(callerId: string, targetUserId: string) {
  if (callerId !== targetUserId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only manage your own notification settings",
    });
  }
}

export const notificationsRouter = createTRPCRouter({
  getNotifications: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const notifications = await ctx.db.notification.findMany({
      where: { intendedForId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        causedBy: { select: { id: true, name: true, username: true, image: true } },
      },
      take: 100,
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
        select: { readAt: true, intendedForId: true },
      });
      // NOT_FOUND, not FORBIDDEN: someone else's notification id must not be
      // confirmed to exist.
      if (!notification || notification.intendedForId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Notification not found" });
      }

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

  // A push subscription carries the browser's `auth`/`p256dh` sending keys, so
  // it is readable and writable by its owner only — never by staff.
  getNotificationConfig: permissionProcedure("notification", "configure")
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      requireSelf(ctx.session.user.id, input.userId);

      const subscription = await ctx.db.pushSubscription.findFirst({
        where: { userId: input.userId },
      });
      return subscription;
    }),

  updateNotificationConfig: permissionProcedure("notification", "configure")
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

      requireSelf(ctx.session.user.id, userId);

      // Delete existing subscription if endpoint is empty
      if (!endpoint) {
        await ctx.db.pushSubscription.deleteMany({
          where: { userId },
        });
        return null;
      }

      // `endpoint` is globally unique, so an unguarded upsert would let anyone
      // holding another user's endpoint rewrite that user's sending keys.
      const existing = await ctx.db.pushSubscription.findUnique({
        where: { endpoint },
        select: { userId: true },
      });
      if (existing && existing.userId !== userId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This subscription is registered to another account",
        });
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

  notifyUser: permissionProcedure("notification", "create")
    .input(
      z.object({
        userId: z.string(),
        message: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUserId = ctx.session.user.id;

      await requireUserInOrganization(ctx, input.userId);

      const notification = await ctx.db.notification.create({
        data: {
          message: input.message,
          eventType: NotificationEvent.CUSTOM_MESSAGE,
          causedById: currentUserId,
          intendedForId: input.userId,
          mediumSent: NotificationMedium.NOTIFICATION,
        },
      });

      void sendPushToUser(ctx.db, input.userId, {
        title: "Tutly",
        body: input.message,
      }).catch((err) => console.error("push send failed:", err));

      return notification;
    }),

  notifyBulkUsers: permissionProcedure("notification", "notifyBulk")
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
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Missing organization",
        });
      }

      // Blasting a whole course is scoped to that course: staff who manage it,
      // or a mentor with a cohort in it.
      await requireCourseReadAccess(ctx, input.courseId);

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
        select: { user: { select: { id: true, organizationId: true } } },
      });

      // The query above already filters by tenancy; assert it so a future edit
      // to that `where` cannot silently start notifying another tenant.
      if (
        enrolledUsers.some((e) => e.user.organizationId !== organizationId)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Recipient outside your organization",
        });
      }

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
        enrolledUsers.map((enrolled) =>
          sendPushToUser(ctx.db, enrolled.user.id, {
            title: "Tutly",
            body: input.message,
            url: input.customLink ?? undefined,
          }).catch((err) => console.error("push send failed:", err)),
        ),
      );

      return notifications;
    }),

  handleNotificationRedirect: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // NOT_FOUND (not FORBIDDEN) so notification ids stay unenumerable
      const notification = await ctx.db.notification.findFirst({
        where: {
          id: input.notificationId,
          intendedForId: ctx.session.user.id,
        },
      });

      if (!notification) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }

      try {
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
        };
      }
    }),

  getNotificationRedirectData: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .query(async ({ ctx, input }) => {
      // NOT_FOUND (not FORBIDDEN) so notification ids stay unenumerable
      const notification = await ctx.db.notification.findFirst({
        where: {
          id: input.notificationId,
          intendedForId: ctx.session.user.id,
        },
      });

      if (!notification) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }

      try {
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
        };
      }
    }),
});
