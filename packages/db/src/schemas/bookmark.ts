import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { bookmarkCategoryEnum, noteCategoryEnum } from "./enums";

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: varchar("id", { length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    category: bookmarkCategoryEnum("category").notNull(),
    objectId: varchar("object_id", { length: 255 }).notNull(),
    causedObjects: text("caused_objects").default("{}"),
    userId: varchar("user_id", { length: 255 })
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

export const notes = pgTable(
  "notes",
  {
    id: varchar("id", { length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => user.id),
    category: noteCategoryEnum("category").notNull(),
    objectId: varchar("object_id", { length: 255 }).notNull(),
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
