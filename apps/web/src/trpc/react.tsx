"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createTRPCReact } from "@trpc/react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import {
  createTrpcClientConfig,
  localStorageBearerStorage,
} from "@tutly/api-client";

import { type AppRouter } from "@/server/api/root";
import { createQueryClient } from "./query-client";
import { getPreviewUrl, NODE_ENV } from "@/lib/constants";

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  clientQueryClientSingleton ??= createQueryClient();

  return clientQueryClientSingleton;
};

export const api: ReturnType<typeof createTRPCReact<AppRouter>> =
  createTRPCReact<AppRouter>();

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    api.createClient(
      createTrpcClientConfig({
        baseUrl: getPreviewUrl(),
        getToken: () => localStorageBearerStorage.getToken(),
        source: "nextjs-react",
        isDev: NODE_ENV === "development",
      }),
    ),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}
