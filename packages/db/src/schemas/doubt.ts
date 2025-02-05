import { relations, sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { courses } from "./course";

export const doubts = pgTable("doubt", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id),
  courseId: uuid("course_id").references(() => courses.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const doubtsRelations = relations(doubts, ({ one, many }) => ({
  user: one(user, { fields: [doubts.userId], references: [user.id] }),
  course: one(courses, { fields: [doubts.courseId], references: [courses.id] }),
  responses: many(responses),
}));

export const responses = pgTable("response", {
  id: uuid("id").primaryKey().defaultRandom(),
  description: text("description"),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id),
  doubtId: uuid("doubt_id")
    .notNull()
    .references(() => doubts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const responsesRelations = relations(responses, ({ one }) => ({
  user: one(user, { fields: [responses.userId], references: [user.id] }),
  doubt: one(doubts, { fields: [responses.doubtId], references: [doubts.id] }),
}));
