import { chatRouter } from "./routers/chat";
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
import { deviceTokensRouter } from "./routers/deviceTokens";
import { doubtsRouter } from "./routers/doubts";
import { driveRouter } from "./routers/drive";
import { fileUploadRouter } from "./routers/fileupload";
import { featureFlagsRouter } from "./routers/featureFlags";
import { foldersRouter } from "./routers/folders";
import { geminiRouter } from "./routers/gemini";
import { glimpseRouter } from "./routers/glimpse";
import { leaderboardRouter } from "./routers/getLeaderboard";
import { holidaysRouter } from "./routers/holidays";
import { mentorsRouter } from "./routers/mentors";
import { notesRouter } from "./routers/notes";
import { notificationsRouter } from "./routers/notifications";
import { oauthRouter } from "./routers/oauth";
import { pointsRouter } from "./routers/points";
import { portSessionsRouter } from "./routers/portSessions";
import { reportRouter } from "./routers/report";
import { reviewsRouter } from "./routers/reviews";
import { sandboxRouter } from "./routers/sandbox";
import { scheduleRouter } from "./routers/schedule";
import { searchRouter } from "./routers/search";
import { serviceConnectionsRouter } from "./routers/serviceConnections";
import { statisticsRouter } from "./routers/statistics";
import { submissionRouter } from "./routers/submission";
import { testRunsRouter } from "./routers/testRuns";
import { usersRouter } from "./routers/users";
import { videosRouter } from "./routers/videos";
import { vscodeRouter } from "./routers/vscode";
import { superAdminRouter } from "./routers/superAdmin";

import { createCallerFactory, createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  superAdmin: superAdminRouter,
  aiQuery: aiQueryRouter,
  chat: chatRouter,
  assignments: assignmentsRouter,
  attachments: attachmentsRouter,
  attendances: attendanceRouter,
  bookmarks: bookmarksRouter,
  certificates: certificatesRouter,
  classes: classesRouter,
  codingPlatforms: codingPlatformsRouter,
  courses: coursesRouter,
  dashboard: dashboardRouter,
  deviceTokens: deviceTokensRouter,
  doubts: doubtsRouter,
  drive: driveRouter,
  featureFlags: featureFlagsRouter,
  fileupload: fileUploadRouter,
  folders: foldersRouter,
  gemini: geminiRouter,
  glimpse: glimpseRouter,
  leaderboard: leaderboardRouter,
  holidays: holidaysRouter,
  mentors: mentorsRouter,
  notes: notesRouter,
  notifications: notificationsRouter,
  oauth: oauthRouter,
  points: pointsRouter,
  portSessions: portSessionsRouter,
  report: reportRouter,
  reviews: reviewsRouter,
  sandbox: sandboxRouter,
  schedule: scheduleRouter,
  search: searchRouter,
  serviceConnections: serviceConnectionsRouter,
  statistics: statisticsRouter,
  submissions: submissionRouter,
  testRuns: testRunsRouter,
  users: usersRouter,
  videos: videosRouter,
  vscode: vscodeRouter,
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
