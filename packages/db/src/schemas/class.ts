import { sql } from "drizzle-orm";
import { pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

import { courses } from "./course";
import { folders, videos } from "./video";

export const classes = pgTable("class", {
  id: varchar("id", { length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: varchar("title", { length: 255 }).default("class"),
  videoId: varchar("video_id", { length: 255 })
    .notNull()
    .references(() => videos.id),
  courseId: varchar("course_id", { length: 255 }).references(() => courses.id),
  folderId: varchar("folder_id", { length: 255 }).references(() => folders.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});
