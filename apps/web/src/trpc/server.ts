import "server-only";

import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { headers } from "next/headers";
import { cache } from "react";

import { createCaller, createTRPCContext, type AppRouter } from "@tutly/api";
import { auth } from "@/server/auth";
import { createQueryClient } from "./query-client";

/**
 * Wraps `createTRPCContext` for tRPC calls from a React Server Component.
 * Loads the Better Auth session from the incoming request's headers and
 * hands it to the shared (Next-agnostic) context creator.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");
  const session = await auth.api.getSession({ headers: heads });
  return createTRPCContext({
    headers: heads,
    // better-auth widens the customSession return to an index-signature
    // object; project the two fields the tRPC context actually declares.
    session: session ? { user: session.user, session: session.session } : null,
  });
});

const getQueryClient = cache(createQueryClient);
const caller = createCaller(createContext);

// Annotated so declaration emit does not have to name @trpc/react-query's
// internal chunk types (TS2742).
type HydrationHelpers = ReturnType<typeof createHydrationHelpers<AppRouter>>;

const hydrationHelpers: HydrationHelpers = createHydrationHelpers<AppRouter>(
  caller,
  getQueryClient,
);

export const api: HydrationHelpers["trpc"] = hydrationHelpers.trpc;
export const HydrateClient: HydrationHelpers["HydrateClient"] =
  hydrationHelpers.HydrateClient;
