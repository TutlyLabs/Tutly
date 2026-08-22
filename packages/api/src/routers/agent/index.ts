import { createTRPCRouter } from "../../trpc";
import { agentAssignmentsRouter } from "./assignments";
import { agentClassesRouter } from "./classes";
import { agentResolveRouter } from "./resolve";

/**
 * Task-level surface for agents, CLIs and integrations.
 *
 * Separate from the feature routers on purpose. Those are shaped for React
 * pages — `getAssignmentsPageData` and friends return deep blobs a component
 * tree destructures — which makes them poor tools: expensive in context and
 * ambiguous about what a call actually does. Procedures here are shaped around
 * one outcome each, return flat results, and compose the multi-step writes the
 * UI leaves to the user to remember.
 *
 * Authorization is unchanged: everything goes through the same `require*Access`
 * guards and role grants as the UI.
 */
export const agentRouter = createTRPCRouter({
  resolve: agentResolveRouter,
  classes: agentClassesRouter,
  assignments: agentAssignmentsRouter,
});
