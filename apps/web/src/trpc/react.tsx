"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { httpBatchStreamLink, loggerLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import SuperJSON from "superjson";

import { type AppRouter } from "@tutly/api";
import { createQueryClient } from "./query-client";
import { getPreviewUrl, NODE_ENV } from "@/lib/constants";
import { isCapacitorBuild } from "@/lib/native";
import { capacitorAsyncStorage } from "@/lib/persist-storage";

const BEARER_TOKEN_KEY = "bearer_token";

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") return createQueryClient();
  clientQueryClientSingleton ??= createQueryClient();
  return clientQueryClientSingleton;
};

export const api: ReturnType<typeof createTRPCReact<AppRouter>> =
  createTRPCReact<AppRouter>();

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const baseUrl = getPreviewUrl();

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        httpBatchStreamLink({
          transformer: SuperJSON,
          url: `${baseUrl.replace(/\/$/, "")}/api/trpc`,
          headers: () => {
            const headers = new Headers();
            headers.set("x-trpc-source", "nextjs-react");
            if (typeof window !== "undefined") {
              const token = window.localStorage.getItem(BEARER_TOKEN_KEY);
              if (token) headers.set("authorization", `Bearer ${token}`);
            }
            return headers;
          },
        }),
      ],
    }),
  );

  if (isCapacitorBuild) {
    return (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: createAsyncStoragePersister({
            storage: capacitorAsyncStorage,
            key: "tutly:rq-cache",
            serialize: (data) => SuperJSON.stringify(data),
            deserialize: (data) => SuperJSON.parse(data),
            throttleTime: 1000,
          }),
          maxAge: 1000 * 60 * 60 * 24 * 7,
        }}
        onSuccess={() => {
          void queryClient.resumePausedMutations();
        }}
      >
        <api.Provider client={trpcClient} queryClient={queryClient}>
          {props.children}
        </api.Provider>
      </PersistQueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}
