import { relations, sql } from "drizzle-orm";
import {
  boolean,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { attachments } from "./attachment";
import { user } from "./auth";
import { classes } from "./class";
import { doubts } from "./doubt";
import { enrolledUsers } from "./enrollment";
import { scheduleEvents } from "./event";

export const courses = pgTable("course", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdById: uuid("created_by_id")
    .notNull()
    .references(() => user.id),
  title: varchar("title", { length: 255 }).notNull(),
  image: varchar("image", { length: 255 }),
  startDate: timestamp("start_date", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  endDate: timestamp("end_date", { withTimezone: true }),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const courseAdmins = pgTable("course_admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const coursesRelations = relations(courses, ({ many, one }) => ({
  createdBy: one(user, {
    fields: [courses.createdById],
    references: [user.id],
    relationName: "CourseCreatedBy",
  }),
  enrolledUsers: many(enrolledUsers),
  classes: many(classes),
  attachments: many(attachments),
  doubts: many(doubts),
  scheduleEvents: many(scheduleEvents),
  courseAdmins: many(courseAdmins),
}));

export const courseAdminsRelations = relations(courseAdmins, ({ one }) => ({
  user: one(user, {
    fields: [courseAdmins.userId],
    references: [user.id],
  }),
  course: one(courses, {
    fields: [courseAdmins.courseId],
    references: [courses.id],
  }),
}));
