import { relations, sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const profiles = pgTable("profile", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
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

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(user, {
    fields: [profiles.userId],
    references: [user.id],
  }),
}));
