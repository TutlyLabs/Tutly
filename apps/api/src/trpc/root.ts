import { assignmentsRouter } from "../router/assignments.js";
import { attachmentsRouter } from "../router/attachments.js";
import { attendanceRouter } from "../router/attendance.js";
import { bookmarksRouter } from "../router/bookmarks.js";
import { classesRouter } from "../router/classes.js";
import { codingPlatformsRouter } from "../router/codingPlatforms.js";
import { coursesRouter } from "../router/courses.js";
import { doubtsRouter } from "../router/doubts.js";
import { fileUploadRouter } from "../router/fileupload.js";
import { foldersRouter } from "../router/folders.js";
import { leaderboardRouter } from "../router/getLeaderboard.js";
import { holidaysRouter } from "../router/holidays.js";
import { mentorsRouter } from "../router/mentors.js";
import { notesRouter } from "../router/notes.js";
import { notificationsRouter } from "../router/notifications.js";
import { pointsRouter } from "../router/points.js";
import { reportRouter } from "../router/report.js";
import { resetPasswordRouter } from "../router/reset-password.js";
import { scheduleRouter } from "../router/schedule.js";
import { statisticsRouter } from "../router/statistics.js";
import { submissionRouter } from "../router/submission.js";
import { usersRouter } from "../router/users.js";
import { createTRPCRouter } from "./index.js";

export const appRouter = createTRPCRouter({
  assignments: assignmentsRouter,
  attachments: attachmentsRouter,
  attendances: attendanceRouter,
  bookmarks: bookmarksRouter,
  classes: classesRouter,
  codingPlatforms: codingPlatformsRouter,
  courses: coursesRouter,
  doubts: doubtsRouter,
  fileupload: fileUploadRouter,
  folders: foldersRouter,
  leaderboard: leaderboardRouter,
  holidays: holidaysRouter,
  mentors: mentorsRouter,
  notes: notesRouter,
  notifications: notificationsRouter,
  points: pointsRouter,
  report: reportRouter,
  reset_password: resetPasswordRouter,
  schedule: scheduleRouter,
  statistics: statisticsRouter,
  submissions: submissionRouter,
  users: usersRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
