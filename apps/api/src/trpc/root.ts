import { assignmentsRouter } from "../router/assignments";
import { attachmentsRouter } from "../router/attachments";
import { attendanceRouter } from "../router/attendance";
import { bookmarksRouter } from "../router/bookmarks";
import { classesRouter } from "../router/classes";
import { codingPlatformsRouter } from "../router/codingPlatforms";
import { coursesRouter } from "../router/courses";
import { doubtsRouter } from "../router/doubts";
import { fileUploadRouter } from "../router/fileupload";
import { foldersRouter } from "../router/folders";
import { leaderboardRouter } from "../router/getLeaderboard";
import { holidaysRouter } from "../router/holidays";
import { mentorsRouter } from "../router/mentors";
import { notesRouter } from "../router/notes";
import { notificationsRouter } from "../router/notifications";
import { pointsRouter } from "../router/points";
import { reportRouter } from "../router/report";
import { resetPasswordRouter } from "../router/reset-password";
import { scheduleRouter } from "../router/schedule";
import { statisticsRouter } from "../router/statistics";
import { submissionRouter } from "../router/submission";
import { usersRouter } from "../router/users";
import { createTRPCRouter } from "./index";

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
