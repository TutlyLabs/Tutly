import { relations, sql } from "drizzle-orm";
import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { fileTypeEnum } from "./enums";

export const files = pgTable("file", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  internalName: varchar("internal_name", { length: 255 }).notNull(),
  associatingId: uuid("associating_id"),
  fileType: fileTypeEnum("file_type").default("OTHER"),
  isPublic: boolean("is_public").default(false),
  publicUrl: varchar("public_url", { length: 255 }),
  isUploaded: boolean("is_uploaded").default(false),
  uploadedById: uuid("uploaded_by_id").references(() => user.id),
  isArchived: boolean("is_archived").default(false),
  archivedById: uuid("archived_by_id").references(() => user.id),
  archiveReason: text("archive_reason"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const filesRelations = relations(files, ({ one }) => ({
  uploadedBy: one(user, {
    fields: [files.uploadedById],
    references: [user.id],
    relationName: "uploadedFiles",
  }),
  archivedBy: one(user, {
    fields: [files.archivedById],
    references: [user.id],
    relationName: "archivedFiles",
  }),
}));
