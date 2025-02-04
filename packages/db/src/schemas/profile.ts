import { sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const profiles = pgTable("profile", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => user.id)
    .unique(),
  dateOfBirth: timestamp("date_of_birth", { withTimezone: true }),
  hobbies: text("hobbies").array(),
  aboutMe: text("about_me"),
  secondaryEmail: varchar("secondary_email", { length: 255 }),
  mobile: varchar("mobile", { length: 255 }),
  whatsapp: varchar("whatsapp", { length: 255 }),
  gender: varchar("gender", { length: 255 }),
  tshirtSize: varchar("tshirt_size", { length: 255 }),
  socialLinks: text("social_links").default("{}"),
  professionalProfiles: text("professional_profiles").default("{}"),
  academicDetails: text("academic_details").default("{}"),
  experiences: text("experiences").array(),
  address: text("address").default("{}"),
  documents: text("documents").default("{}"),
  metadata: text("metadata").default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});
