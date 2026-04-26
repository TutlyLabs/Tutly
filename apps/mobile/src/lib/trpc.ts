import { createTRPCReact } from "@trpc/react-query";
import type { CreateTRPCReact } from "@trpc/react-query";
import { createTrpcClientConfig } from "@tutly/api-client";
import type { AppRouter } from "@tutly/types";

import { nativeBearerStorage } from "@/native/storage";
import { API_BASE_URL, IS_DEV } from "@/lib/env";

// Explicit type annotation prevents TS from emitting deep references to
// Prisma's internal generated paths in the inferred type.
export const trpc: CreateTRPCReact<AppRouter, unknown> =
  createTRPCReact<AppRouter>();

export function createMobileTrpcClient(): ReturnType<typeof trpc.createClient> {
  return trpc.createClient(
    createTrpcClientConfig({
      baseUrl: API_BASE_URL,
      getToken: () => nativeBearerStorage.getToken(),
      source: "mobile",
      isDev: IS_DEV,
    }),
  );
}
