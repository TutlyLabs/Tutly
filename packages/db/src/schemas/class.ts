import { relations, sql } from "drizzle-orm";
import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { attachments } from "./attachment";
import { courses } from "./course";
import { attendance } from "./enrollment";
import { folders, videos } from "./video";

export const classes = pgTable("class", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).default("class"),
  videoId: uuid("video_id")
    .notNull()
    .references(() => videos.id),
  courseId: uuid("course_id").references(() => courses.id),
  folderId: uuid("folder_id").references(() => folders.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const classesRelations = relations(classes, ({ one, many }) => ({
  video: one(videos, { fields: [classes.videoId], references: [videos.id] }),
  course: one(courses, {
    fields: [classes.courseId],
    references: [courses.id],
  }),
  folder: one(folders, {
    fields: [classes.folderId],
    references: [folders.id],
  }),
  attachments: many(attachments),
  attendance: many(attendance),
}));
