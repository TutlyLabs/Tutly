import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { submissions } from "./attachment";
import { user } from "./auth";
import { classes } from "./class";
import { courses } from "./course";

export const enrolledUsers = pgTable(
  "enrolled_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id),
    mentorId: uuid("mentor_id").references(() => user.id),
    startDate: timestamp("start_date", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    courseId: uuid("course_id").references(() => courses.id),
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

export const enrolledUsersRelations = relations(
  enrolledUsers,
  ({ one, many }) => ({
    user: one(user, {
      relationName: "user",
      fields: [enrolledUsers.userId],
      references: [user.id],
    }),
    mentor: one(user, {
      relationName: "mentor",
      fields: [enrolledUsers.mentorId],
      references: [user.id],
    }),
    course: one(courses, {
      fields: [enrolledUsers.courseId],
      references: [courses.id],
    }),
    submissions: many(submissions),
  }),
);

export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    classId: uuid("class_id")
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

export const attendanceRelations = relations(attendance, ({ one }) => ({
  user: one(user, {
    fields: [attendance.userId],
    references: [user.id],
  }),
  class: one(classes, {
    fields: [attendance.classId],
    references: [classes.id],
  }),
}));
