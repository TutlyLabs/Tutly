import { sql } from "drizzle-orm";
import {
  boolean,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { fileTypeEnum } from "./enums";

export const files = pgTable("file", {
  id: varchar("id", { length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  internalName: varchar("internal_name", { length: 255 }).notNull(),
  associatingId: varchar("associating_id", { length: 255 }),
  fileType: fileTypeEnum("file_type").default("OTHER"),
  isPublic: boolean("is_public").default(false),
  publicUrl: varchar("public_url", { length: 255 }),
  isUploaded: boolean("is_uploaded").default(false),
  uploadedById: varchar("uploaded_by_id", { length: 255 }).references(
    () => user.id,
  ),
  isArchived: boolean("is_archived").default(false),
  archivedById: varchar("archived_by_id", { length: 255 }).references(
    () => user.id,
  ),
  archiveReason: text("archive_reason"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});
