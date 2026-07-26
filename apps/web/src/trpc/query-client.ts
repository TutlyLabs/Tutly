import {
  defaultShouldDehydrateQuery,
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";
import { isTRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import SuperJSON from "superjson";

import type { AppRouter } from "@tutly/api";

const DEFAULT_MESSAGE = "Something went wrong. Please try again.";

function httpStatusOf(error: unknown): number | undefined {
  return isTRPCClientError<AppRouter>(error)
    ? error.data?.httpStatus
    : undefined;
}

function messageOf(error: unknown): string {
  const status = httpStatusOf(error);
  // 5xx messages are internal detail; only client-fault errors carry text
  // meant for a human.
  if (status !== undefined && status < 500 && error instanceof Error) {
    return error.message || DEFAULT_MESSAGE;
  }
  return DEFAULT_MESSAGE;
}

// Queries render their own empty/error states, so only mutations toast by
// default. Both caches still stop the silent-failure case where a call site
// forgets `onError`.
function reportError(error: unknown) {
  if (typeof window === "undefined") return;
  toast.error(messageOf(error));
}

export const createQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        // A query that already has data on screen refetching in the background
        // should not interrupt the user.
        if (query.state.data !== undefined) return;
        reportError(error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.options.onError) return;
        reportError(error);
      },
    }),
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
        retry: (failureCount, error) => {
          const status = httpStatusOf(error);
          // 4xx (NOT_FOUND, FORBIDDEN, BAD_REQUEST…) will never succeed on a
          // retry; only retry genuine server/network faults.
          if (status !== undefined && status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
