import { relations, sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { classes } from "./class";
import { videoTypeEnum } from "./enums";

export const videos = pgTable("video", {
  id: uuid("id").primaryKey().defaultRandom(),
  videoLink: varchar("video_link", { length: 255 }),
  videoType: videoTypeEnum("video_type").notNull(),
  timeStamps: text("time_stamps").default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const videosRelations = relations(videos, ({ many }) => ({
  classes: many(classes),
}));

export const folders = pgTable("folder", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).default("Folder"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const foldersRelations = relations(folders, ({ many }) => ({
  classes: many(classes),
}));
