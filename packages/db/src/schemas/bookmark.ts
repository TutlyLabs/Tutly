import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { bookmarkCategoryEnum, noteCategoryEnum } from "./enums";

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: bookmarkCategoryEnum("category").notNull(),
    objectId: uuid("object_id").notNull(),
    causedObjects: text("caused_objects").default("{}"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
  },
  (bookmark) => ({
    uniqueUserObject: uniqueIndex("unique_user_object").on(
      bookmark.userId,
      bookmark.objectId,
    ),
  }),
);

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(user, { fields: [bookmarks.userId], references: [user.id] }),
}));

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id),
    category: noteCategoryEnum("category").notNull(),
    objectId: uuid("object_id").notNull(),
    causedObjects: text("caused_objects").default("{}"),
    description: text("description"),
    tags: text("tags").array(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
  },
  (note) => ({
    uniqueUserObject: uniqueIndex("unique_user_note_object").on(
      note.userId,
      note.objectId,
    ),
  }),
);

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(user, { fields: [notes.userId], references: [user.id] }),
}));
