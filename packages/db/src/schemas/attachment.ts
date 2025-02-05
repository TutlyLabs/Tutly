import { relations, sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { classes } from "./class";
import { courses } from "./course";
import { enrolledUsers } from "./enrollment";
import {
  attachmentTypeEnum,
  pointCategoryEnum,
  submissionModeEnum,
} from "./enums";

export const attachments = pgTable("attachment", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).default("Attachment"),
  details: text("details"),
  attachmentType: attachmentTypeEnum("attachment_type").notNull(),
  link: varchar("link", { length: 255 }),
  maxSubmissions: integer("max_submissions").default(1),
  classId: uuid("class_id").references(() => classes.id),
  courseId: uuid("course_id").references(() => courses.id),
  submissionMode: submissionModeEnum("submission_mode").default("HTML_CSS_JS"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const attachmentsRelations = relations(attachments, ({ one, many }) => ({
  class: one(classes, {
    fields: [attachments.classId],
    references: [classes.id],
  }),
  course: one(courses, {
    fields: [attachments.courseId],
    references: [courses.id],
  }),
  submissions: many(submissions),
}));

export const submissions = pgTable("submission", {
  id: uuid("id").primaryKey().defaultRandom(),
  enrolledUserId: uuid("enrolled_user_id")
    .notNull()
    .references(() => enrolledUsers.id),
  attachmentId: uuid("attachment_id")
    .notNull()
    .references(() => attachments.id),
  data: text("data").default("{}"),
  overallFeedback: text("overall_feedback"),
  editTime: timestamp("edit_time", { withTimezone: true })
    .default(sql`(NOW() + '15 minutes'::interval)`)
    .notNull(),
  submissionLink: varchar("submission_link", { length: 255 }),
  submissionDate: timestamp("submission_date", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  enrolledUser: one(enrolledUsers, {
    fields: [submissions.enrolledUserId],
    references: [enrolledUsers.id],
  }),
  attachment: one(attachments, {
    fields: [submissions.attachmentId],
    references: [attachments.id],
  }),
  points: many(points),
}));

export const points = pgTable(
  "point",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: pointCategoryEnum("category").notNull(),
    feedback: text("feedback"),
    score: integer("score").default(0),
    submissionId: uuid("submission_id").references(() => submissions.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
  },
  (point) => ({
    uniqueSubmissionCategory: uniqueIndex("unique_submission_category").on(
      point.submissionId,
      point.category,
    ),
  }),
);

export const pointsRelations = relations(points, ({ one }) => ({
  submission: one(submissions, {
    fields: [points.submissionId],
    references: [submissions.id],
  }),
}));
