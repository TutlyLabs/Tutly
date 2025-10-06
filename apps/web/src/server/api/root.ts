import { aiQueryRouter } from "./routers/aiQuery";
import { assignmentsRouter } from "./routers/assignments";
import { attachmentsRouter } from "./routers/attachments";
import { attendanceRouter } from "./routers/attendance";
import { bookmarksRouter } from "./routers/bookmarks";
import { certificatesRouter } from "./routers/certificates";
import { classesRouter } from "./routers/classes";
import { codingPlatformsRouter } from "./routers/codingPlatforms";
import { coursesRouter } from "./routers/courses";
import { dashboardRouter } from "./routers/dashboard";
import { doubtsRouter } from "./routers/doubts";
import { driveRouter } from "./routers/drive";
import { fileUploadRouter } from "./routers/fileupload";
import { foldersRouter } from "./routers/folders";
import { geminiRouter } from "./routers/gemini";
import { leaderboardRouter } from "./routers/getLeaderboard";
import { holidaysRouter } from "./routers/holidays";
import { mentorsRouter } from "./routers/mentors";
import { notesRouter } from "./routers/notes";
import { notificationsRouter } from "./routers/notifications";
import { oauthRouter } from "./routers/oauth";
import { pointsRouter } from "./routers/points";
import { reportRouter } from "./routers/report";
import { sandboxRouter } from "./routers/sandbox";
import { scheduleRouter } from "./routers/schedule";
import { statisticsRouter } from "./routers/statistics";
import { submissionRouter } from "./routers/submission";
import { usersRouter } from "./routers/users";

import { createCallerFactory, createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  aiQuery: aiQueryRouter,
  assignments: assignmentsRouter,
  attachments: attachmentsRouter,
  attendances: attendanceRouter,
  bookmarks: bookmarksRouter,
  certificates: certificatesRouter,
  classes: classesRouter,
  codingPlatforms: codingPlatformsRouter,
  courses: coursesRouter,
  dashboard: dashboardRouter,
  doubts: doubtsRouter,
  drive: driveRouter,
  fileupload: fileUploadRouter,
  folders: foldersRouter,
  gemini: geminiRouter,
  leaderboard: leaderboardRouter,
  holidays: holidaysRouter,
  mentors: mentorsRouter,
  notes: notesRouter,
  notifications: notificationsRouter,
  oauth: oauthRouter,
  points: pointsRouter,
  report: reportRouter,
  sandbox: sandboxRouter,
  schedule: scheduleRouter,
  statistics: statisticsRouter,
  submissions: submissionRouter,
  users: usersRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
