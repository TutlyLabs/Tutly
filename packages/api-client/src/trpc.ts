import { httpBatchStreamLink, loggerLink, type TRPCLink } from "@trpc/client";
import type { AnyTRPCRouter } from "@trpc/server";
import SuperJSON from "superjson";

export interface TrpcClientOptions {
  /** Origin of the API server, e.g. "https://learn.tutly.in" */
  baseUrl: string;
  /** Returns the current bearer token, if any. */
  getToken: () => string | null | Promise<string | null>;
  /** Optional source label sent as `x-trpc-source`. */
  source?: string;
  /** Toggle verbose logger output. Defaults to errors-only. */
  isDev?: boolean;
}

/**
 * Returns the link configuration suitable for `api.createClient(...)`.
 *
 * Keep this non-generic: tRPC's link types involve a transformer constraint
 * that doesn't unify cleanly with a free TRouter type variable. The
 * router type flows in via `createTRPCReact<AppRouter>()` at the caller.
 */
export function createTrpcClientConfig(opts: TrpcClientOptions) {
  const url = `${opts.baseUrl.replace(/\/$/, "")}/api/trpc`;

  return {
    links: [
      loggerLink({
        enabled: (op) =>
          Boolean(opts.isDev) ||
          (op.direction === "down" && op.result instanceof Error),
      }),
      httpBatchStreamLink({
        transformer: SuperJSON,
        url,
        headers: async () => {
          const headers = new Headers();
          headers.set("x-trpc-source", opts.source ?? "client");
          const token = await opts.getToken();
          if (token) headers.set("authorization", `Bearer ${token}`);
          return headers;
        },
      }),
    ],
  };
}

// Re-export TRPCLink + AnyTRPCRouter so consumers don't need a separate
// `@trpc/client` / `@trpc/server` dependency just for these symbols.
export type { TRPCLink, AnyTRPCRouter };
