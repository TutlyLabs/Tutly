import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { classes } from "./class";
import { courses } from "./course";

export const enrolledUsers = pgTable(
  "enrolled_users",
  {
    id: varchar("id", { length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 255 })
      .notNull()
      .references(() => user.id),
    mentorId: varchar("mentorId", { length: 255 }).references(() => user.id),
    startDate: timestamp("start_date", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    courseId: varchar("course_id", { length: 255 }).references(
      () => courses.id,
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
  },
  (enrolledUser) => ({
    uniqueEnrollment: uniqueIndex("unique_enrollment").on(
      enrolledUser.userId,
      enrolledUser.courseId,
      enrolledUser.mentorId,
    ),
  }),
);

export const attendance = pgTable(
  "attendance",
  {
    id: varchar("id", { length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 255 })
      .notNull()
      .references(() => user.id),
    classId: varchar("class_id", { length: 255 })
      .notNull()
      .references(() => classes.id),
    attendedDuration: integer("attended_duration"),
    attended: boolean("attended").default(false),
    data: text("data").array(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
  },
  (attendance) => ({
    uniqueAttendance: uniqueIndex("unique_attendance").on(
      attendance.userId,
      attendance.classId,
    ),
  }),
);
