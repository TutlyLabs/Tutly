import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { notificationEventEnum, notificationMediumEnum } from "./enums";

export const pushSubscriptions = pgTable("push_subscription", {
  id: varchar("id", { length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  endpoint: varchar("endpoint", { length: 255 }).notNull().unique(),
  p256dh: varchar("p256dh", { length: 255 }).notNull(),
  auth: varchar("auth", { length: 255 }).notNull(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const notifications = pgTable("notification", {
  id: varchar("id", { length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  intendedForId: varchar("intended_for_id", { length: 255 })
    .notNull()
    .references(() => user.id),
  mediumSent: notificationMediumEnum("medium_sent").default("PUSH"),
  customLink: varchar("custom_link", { length: 255 }),
  causedById: varchar("caused_by_id", { length: 255 }).references(
    () => user.id,
  ),
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
