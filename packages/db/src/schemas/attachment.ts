import { sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
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
  id: varchar("id", { length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: varchar("title", { length: 255 }).default("Attachment"),
  details: text("details"),
  attachmentType: attachmentTypeEnum("attachment_type").notNull(),
  link: varchar("link", { length: 255 }),
  maxSubmissions: integer("max_submissions").default(1),
  classId: varchar("class_id", { length: 255 }).references(() => classes.id),
  courseId: varchar("course_id", { length: 255 }).references(() => courses.id),
  submissionMode: submissionModeEnum("submission_mode").default("HTML_CSS_JS"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const submissions = pgTable("submission", {
  id: varchar("id", { length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  enrolledUserId: varchar("enrolled_user_id", { length: 255 })
    .notNull()
    .references(() => enrolledUsers.id),
  attachmentId: varchar("attachment_id", { length: 255 })
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

export const points = pgTable(
  "point",
  {
    id: varchar("id", { length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    category: pointCategoryEnum("category").notNull(),
    feedback: text("feedback"),
    score: integer("score").default(0),
    submissionId: varchar("submission_id", { length: 255 }).references(
      () => submissions.id,
    ),
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
