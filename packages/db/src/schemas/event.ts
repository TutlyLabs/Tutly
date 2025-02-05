import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { courses } from "./course";
import { eventAttachmentTypeEnum } from "./enums";

export const scheduleEvents = pgTable("schedule_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  isPublished: boolean("is_published").default(false),
  courseId: uuid("course_id").references(() => courses.id),
  createdById: uuid("created_by_id")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const scheduleEventsRelations = relations(
  scheduleEvents,
  ({ one, many }) => ({
    course: one(courses, {
      fields: [scheduleEvents.courseId],
      references: [courses.id],
    }),
    createdBy: one(user, {
      fields: [scheduleEvents.createdById],
      references: [user.id],
    }),
    attachments: many(eventAttachments),
  }),
);

export const eventAttachments = pgTable("event_attachment", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  type: eventAttachmentTypeEnum("type").notNull(),
  details: text("details"),
  link: varchar("link", { length: 255 }),
  ordering: integer("ordering").default(1),
  eventId: uuid("event_id")
    .notNull()
    .references(() => scheduleEvents.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const eventAttachmentsRelations = relations(
  eventAttachments,
  ({ one }) => ({
    event: one(scheduleEvents, {
      fields: [eventAttachments.eventId],
      references: [scheduleEvents.id],
    }),
  }),
);
