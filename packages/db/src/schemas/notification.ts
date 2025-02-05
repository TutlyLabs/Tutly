import { relations, sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { notificationEventEnum, notificationMediumEnum } from "./enums";

export const pushSubscriptions = pgTable("push_subscription", {
  id: uuid("id").primaryKey().defaultRandom(),
  endpoint: varchar("endpoint", { length: 255 }).notNull().unique(),
  p256dh: varchar("p256dh", { length: 255 }).notNull(),
  auth: varchar("auth", { length: 255 }).notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const pushSubscriptionsRelations = relations(
  pushSubscriptions,
  ({ one }) => ({
    user: one(user, {
      fields: [pushSubscriptions.userId],
      references: [user.id],
    }),
  }),
);

export const notifications = pgTable("notification", {
  id: uuid("id").primaryKey().defaultRandom(),
  intendedForId: uuid("intended_for_id")
    .notNull()
    .references(() => user.id),
  mediumSent: notificationMediumEnum("medium_sent").default("PUSH"),
  customLink: varchar("custom_link", { length: 255 }),
  causedById: uuid("caused_by_id").references(() => user.id),
  eventType: notificationEventEnum("event_type").notNull(),
  message: text("message"),
  causedObjects: text("caused_objects").default("{}"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  intendedFor: one(user, {
    fields: [notifications.intendedForId],
    references: [user.id],
    relationName: "notificationIntendedFor",
  }),
  causedBy: one(user, {
    fields: [notifications.causedById],
    references: [user.id],
    relationName: "notificationCausedBy",
  }),
}));
