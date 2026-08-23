import { createTRPCRouter } from "../../trpc";
import { agentAssignmentsRouter } from "./assignments";
import { agentAttendanceRouter } from "./attendance";
import { agentClassesRouter } from "./classes";
import { agentCoursesRouter } from "./courses";
import { agentResolveRouter } from "./resolve";

/**
 * Task-level surface for agents, CLIs and integrations.
 *
 * Kept separate from the feature routers, which return page-shaped blobs that
 * make expensive, ambiguous tools. Each procedure here covers one outcome and
 * returns a flat result, using the same `require*Access` guards and role grants
 * as the UI.
 */
export const agentRouter = createTRPCRouter({
  resolve: agentResolveRouter,
  courses: agentCoursesRouter,
  classes: agentClassesRouter,
  attendance: agentAttendanceRouter,
  assignments: agentAssignmentsRouter,
});
